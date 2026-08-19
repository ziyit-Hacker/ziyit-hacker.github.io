import os
import json

def generate_recipe_list():
    """自动遍历 recipe 目录，生成 recipes.txt"""
    
    # 配置
    recipe_dir = './recipe'
    output_file = './recipe/recipes.txt'
    
    # 要扫描的子目录
    sub_dirs = ['mods', 'minecraft']
    
    # 收集所有JSON文件路径
    all_files = []
    
    for sub_dir in sub_dirs:
        dir_path = os.path.join(recipe_dir, sub_dir)
        if not os.path.exists(dir_path):
            print(f"⚠ 目录不存在: {dir_path}")
            continue
            
        # 遍历目录下所有JSON文件
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.endswith('.json'):
                    # 获取相对路径
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, recipe_dir)
                    all_files.append(rel_path)
    
    # 排序
    all_files.sort()
    
    # 写入recipes.txt
    with open(output_file, 'w', encoding='utf-8') as f:
        for file_path in all_files:
            # 使用反斜杠或正斜杠统一
            # Windows使用反斜杠，这里统一为正斜杠
            f.write(file_path.replace('\\', '/') + '\n')
    
    print(f"✅ 生成完成！共 {len(all_files)} 个配方文件")
    print(f"📁 保存到: {output_file}")
    
    # 打印文件列表预览
    for f in all_files:
        print(f"  - {f}")

if __name__ == '__main__':
    generate_recipe_list()
