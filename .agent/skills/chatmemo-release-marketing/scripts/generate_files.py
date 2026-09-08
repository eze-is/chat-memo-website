#!/usr/bin/env python3
"""
Chat Memo 海报与宣传 Markdown 生成工具

使用方法：
    python3 generate_files.py --version 1.1.3 --date "2025年12月10日" \
        --title "大模型支持升级\n新增 Claude 3.5 录制" \
        --headline "支持 Claude 了！Chat Memo v1.1.3 发布" \
        --summary "重磅功能来啦！" \
        --features "🚀|新增 Claude 支持|现在可以自动保存 Claude 的对话记录了" \
                         "✨|搜索功能优化|搜索速度提升 3 倍" \
                         "🔧|修复 Gemini 问题|解决 Gemini 消息重复保存的问题"

输出：
    - {version}.html: 更新海报 HTML 文件
    - {version}-update.md: 更新说明文档

特性：
    - 自动创建 update-item/ 输出目录
    - 自动复制 logo-single.png 到输出目录
"""

import argparse
import os
import sys
from datetime import datetime

# 确保脚本在正确的目录中运行
def get_template_dir():
    """获取模板文件夹路径"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(current_dir)
    assets_dir = os.path.join(skill_dir, "assets")
    return assets_dir

def load_template(template_name):
    """加载模板文件"""
    template_dir = get_template_dir()
    template_path = os.path.join(template_dir, template_name)

    if not os.path.exists(template_path):
        # 额外检查：可能在当前工作目录
        template_path = template_name
        if not os.path.exists(template_path):
            print(f"❌ 模板文件不存在: {template_path}")
            print(f"   请在 {template_dir} 目录中创建模板文件")
            sys.exit(1)

    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()

def get_project_root():
    """获取官网仓根目录。"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # scripts → chatmemo-release-marketing → skills → .agent → website
    for _ in range(4):
        current_dir = os.path.dirname(current_dir)
    return current_dir

def setup_output_directory(output_dir):
    """
    设置输出目录：
    1. 创建 update-item/ 目录（如果不存在）
    2. 复制 logo-single.png 到输出目录
    """
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)

    # 官网仓根目录
    project_root = get_project_root()

    # Logo 文件路径
    logo_src = os.path.join(project_root, "logo-single.png")
    logo_dest = os.path.join(output_dir, "logo-single.png")

    # 检查 logo 是否存在
    if not os.path.exists(logo_src):
        print(f"⚠️  警告：找不到 logo 文件: {logo_src}")
        print("   请确保 logo-single.png 存在于项目根目录")
        # 尝试使用 assets 目录中的 logo
        assets_dir = get_template_dir()
        logo_src_alt = os.path.join(assets_dir, "logo-single.png")
        if os.path.exists(logo_src_alt):
            logo_src = logo_src_alt
            print(f"   使用备用路径: {logo_src}")
        else:
            print(f"   备用路径也不存在: {logo_src_alt}")
            return False

    # 复制 logo 文件
    try:
        import shutil
        shutil.copy2(logo_src, logo_dest)
        print(f"✅ 已复制 logo 到: {logo_dest}")
        return True
    except Exception as e:
        print(f"❌ 复制 logo 失败: {e}")
        return False

def generate_update_cards(features):
    """生成更新卡片 HTML"""
    cards = []

    for idx, feature in enumerate(features):
        parts = feature.split("|", 2)
        if len(parts) != 3:
            print(f"❌ 功能格式错误: {feature}")
            print("   正确格式: 图标|标题|描述")
            sys.exit(1)

        icon, title, desc = parts
        card_class = "card highlight" if idx == 0 else "card"

        card_html = f"""\n                <!-- 卡片 {idx + 1}: {title} -->
                <div class="{card_class}">
                    <div class="icon-box">{icon}</div>
                    <div class="card-content">
                        <h3>{title}</h3>
                        <p>{desc}</p>
                    </div>
                </div>"""
        cards.append(card_html)

    return "".join(cards)

def generate_feature_list(features):
    """生成 Markdown 功能列表"""
    lines = []
    for idx, feature in enumerate(features):
        parts = feature.split("|", 2)
        if len(parts) != 3:
            continue
        icon, title, desc = parts
        lines.append(f"{idx + 1}️⃣ {title}")
        lines.append(f"{desc}")
        lines.append("")  # 空行
    return "\n".join(lines).rstrip()

def generate_html_poster(version, date, title, features):
    """生成海报 HTML"""
    template = load_template("poster-template.html")

    update_cards = generate_update_cards(features)

    html = template.replace("{VERSION}", version)
    html = html.replace("{DATE}", date)
    html = html.replace("{MAIN_TITLE}", title.replace("\n", "<br>"))
    html = html.replace("{UPDATE_CARDS}", update_cards)

    return html

def generate_markdown_update(version, headline, summary, features):
    """生成更新说明 Markdown"""
    template = load_template("markdown-template.md")

    feature_list = generate_feature_list(features)

    markdown = template.replace("{HEADLINE}", headline)
    markdown = markdown.replace("{EXECUTIVE_SUMMARY}", summary)
    markdown = markdown.replace("{FEATURE_LIST}", feature_list)

    return markdown

def save_file(content, filename):
    """保存文件"""
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ 文件已生成: {filename}")
    except Exception as e:
        print(f"❌ 保存文件失败: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="生成 Chat Memo 更新海报和更新说明文档",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
模板文件位置：
  - assets/poster-template.html
  - assets/markdown-template.md

提示：
  - 标题中的换行使用 \\n
示例：
  python3 %(prog)s --version 1.1.3 --date "2025年12月10日" \\\n    --title "大模型支持升级\\n新增 Claude 3.5 录制" \\\n    --headline "支持 Claude 了！Chat Memo v1.1.3 发布" \\\n    --summary "重磅功能来啦！" \\\n    --features "🚀|新增 Claude 支持|现在可以自动保存 Claude 的对话记录了" \\\n                "✨|搜索功能优化|搜索速度提升 3 倍" \\\n                "🔧|修复 Gemini 问题|解决 Gemini 消息重复保存的问题"
"""
    )

    parser.add_argument("--version", required=True, help="版本号（例如：1.1.2）")
    parser.add_argument("--date", required=True, help="发布日期（例如：2025年12月3日）")
    parser.add_argument("--title", required=True, help="主标题，可用 \\n 换行")
    parser.add_argument("--headline", required=True, help="更新说明的标题")
    parser.add_argument("--summary", required=True, help="更新内容概述")
    parser.add_argument("--features", required=True, nargs="+", help="功能列表，格式：图标|标题|描述")
    parser.add_argument("--output", default="update-item", help="输出目录（默认：update-item）")

    args = parser.parse_args()

    # 脚本运行时的项目根目录判定
    # 官网仓根目录
    project_root = get_project_root()

    # 计算最终的输出目录路径
    if os.path.isabs(args.output):
        output_dir = args.output
    else:
        # 相对路径则相对于项目根目录
        output_dir = os.path.join(project_root, args.output)

    print(f"📦 正在生成 Chat Memo {args.version} 更新文件...")
    print()

    # 设置输出目录并复制 logo
    print(f"📁 设置输出目录: {output_dir}")
    logo_copied = setup_output_directory(output_dir)
    print()

    # 生成海报 HTML
    print("🎨 生成海报 HTML...")
    html_content = generate_html_poster(
        version=args.version,
        date=args.date,
        title=args.title,
        features=args.features
    )

    html_filename = os.path.join(output_dir, f"{args.version}.html")
    save_file(html_content, html_filename)
    print()

    # 生成 Markdown 更新说明
    print("📝 生成更新说明 Markdown...")
    markdown_content = generate_markdown_update(
        version=args.version,
        headline=args.headline,
        summary=args.summary,
        features=args.features
    )

    md_filename = os.path.join(output_dir, f"{args.version}-update.md")
    save_file(markdown_content, md_filename)
    print()

    print("✨ 完成！生成文件：")
    print(f"   - {html_filename}")
    print(f"   - {md_filename}")
    if logo_copied:
        print(f"   - {os.path.join(output_dir, 'logo-single.png')}")
    print()
    print("📝 请检查生成的文件，并根据需要调整样式或内容。")

if __name__ == "__main__":
    main()
