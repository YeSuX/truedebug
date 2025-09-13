#!/usr/bin/env python3
"""
演示用的有bug的Python代码
这个文件包含了一个典型的索引越界错误
"""

def process_items(items):
    """
    处理项目列表的函数
    Bug: 循环边界错误导致IndexError
    """
    print(f"开始处理 {len(items)} 个项目")
    
    # 这里有bug: range(len(items)+1) 会导致索引越界
    for i in range(len(items) + 1):
        print(f"正在处理第 {i+1} 个项目...")
        item = items[i]  # 当 i == len(items) 时会抛出 IndexError
        print(f"项目内容: {item}")
        
        # 模拟一些处理逻辑
        if item.startswith("重要"):
            print(f"  -> 这是重要项目: {item}")
        else:
            print(f"  -> 普通项目: {item}")
    
    print("所有项目处理完成!")

def main():
    """主函数"""
    print("=== Bug演示程序 ===")
    
    # 测试数据
    test_items = [
        "重要-项目A",
        "项目B", 
        "重要-项目C",
        "项目D"
    ]
    
    print(f"准备处理 {len(test_items)} 个项目:")
    for i, item in enumerate(test_items):
        print(f"  {i+1}. {item}")
    
    print("\n开始处理...")
    
    try:
        process_items(test_items)
    except Exception as e:
        print(f"\n❌ 程序出错: {e}")
        print(f"错误类型: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
