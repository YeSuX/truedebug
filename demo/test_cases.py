#!/usr/bin/env python3
"""
测试用例集合
用于验证buggy.py的各种场景
"""

import unittest
import sys
import os

# 添加上级目录到路径，以便导入buggy模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from demo.buggy import process_items

class TestProcessItems(unittest.TestCase):
    """测试 process_items 函数的各种场景"""
    
    def test_case_001_normal_list(self):
        """测试用例001: 正常列表处理"""
        items = ["项目A", "项目B", "项目C"]
        
        # 这个测试会失败，因为有bug
        with self.assertRaises(IndexError):
            process_items(items)
    
    def test_case_002_empty_list(self):
        """测试用例002: 空列表处理"""
        items = []
        
        # 空列表也会有问题，因为range(0+1)=range(1)会尝试访问items[0]
        with self.assertRaises(IndexError):
            process_items(items)
    
    def test_case_003_single_item(self):
        """测试用例003: 单个项目"""
        items = ["单个项目"]
        
        # 单个项目也会失败
        with self.assertRaises(IndexError):
            process_items(items)
    
    def test_case_004_large_list(self):
        """测试用例004: 大列表处理"""
        items = [f"项目{i}" for i in range(10)]
        
        # 大列表同样会失败
        with self.assertRaises(IndexError):
            process_items(items)
    
    def test_case_005_special_characters(self):
        """测试用例005: 特殊字符项目"""
        items = ["重要-项目A", "项目@B", "项目#C"]
        
        with self.assertRaises(IndexError):
            process_items(items)

class TestProcessItemsFixed(unittest.TestCase):
    """测试修复后的 process_items 函数"""
    
    def process_items_fixed(self, items):
        """修复后的版本 - 正确的循环边界"""
        print(f"开始处理 {len(items)} 个项目")
        
        # 修复: 使用 range(len(items)) 而不是 range(len(items)+1)
        for i in range(len(items)):
            print(f"正在处理第 {i+1} 个项目...")
            item = items[i]
            print(f"项目内容: {item}")
            
            if item.startswith("重要"):
                print(f"  -> 这是重要项目: {item}")
            else:
                print(f"  -> 普通项目: {item}")
        
        print("所有项目处理完成!")
    
    def test_fixed_normal_list(self):
        """测试修复后的正常列表处理"""
        items = ["项目A", "项目B", "项目C"]
        
        # 修复后应该不会抛出异常
        try:
            self.process_items_fixed(items)
        except Exception as e:
            self.fail(f"修复后的函数不应该抛出异常: {e}")
    
    def test_fixed_empty_list(self):
        """测试修复后的空列表处理"""
        items = []
        
        try:
            self.process_items_fixed(items)
        except Exception as e:
            self.fail(f"修复后的函数处理空列表不应该抛出异常: {e}")
    
    def test_fixed_single_item(self):
        """测试修复后的单个项目"""
        items = ["单个项目"]
        
        try:
            self.process_items_fixed(items)
        except Exception as e:
            self.fail(f"修复后的函数处理单个项目不应该抛出异常: {e}")

def run_all_tests():
    """运行所有测试用例"""
    print("=== 运行测试用例 ===\n")
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加原始版本的测试（预期失败）
    suite.addTest(TestProcessItems('test_case_001_normal_list'))
    suite.addTest(TestProcessItems('test_case_002_empty_list'))
    suite.addTest(TestProcessItems('test_case_003_single_item'))
    suite.addTest(TestProcessItems('test_case_004_large_list'))
    suite.addTest(TestProcessItems('test_case_005_special_characters'))
    
    # 添加修复版本的测试（预期成功）
    suite.addTest(TestProcessItemsFixed('test_fixed_normal_list'))
    suite.addTest(TestProcessItemsFixed('test_fixed_empty_list'))
    suite.addTest(TestProcessItemsFixed('test_fixed_single_item'))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print(f"\n=== 测试结果摘要 ===")
    print(f"总测试数: {result.testsRun}")
    print(f"失败数: {len(result.failures)}")
    print(f"错误数: {len(result.errors)}")
    print(f"成功数: {result.testsRun - len(result.failures) - len(result.errors)}")
    
    return result

if __name__ == "__main__":
    run_all_tests()
