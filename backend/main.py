#!/usr/bin/env python3
"""
VibeStepper 后端服务
协议化调试工具的API服务端
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import json

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VibeStepper API",
    description="协议化调试工具后端服务",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型定义
class BugReport(BaseModel):
    title: str
    description: str
    code_file: str
    error_message: str
    stack_trace: List[str]
    test_cases: List[str]
    environment: Dict[str, str]

class GenerateMRERequest(BaseModel):
    bug_report: BugReport

class AnalyzeRootCauseRequest(BaseModel):
    bug_report: BugReport

class Hypothesis(BaseModel):
    description: str
    evidence: str
    confidence: float

class GenerateInstrumentationRequest(BaseModel):
    hypothesis: Hypothesis

class RunExperimentRequest(BaseModel):
    mre_code: str
    instrumentations: List[str]

class GeneratePatchRequest(BaseModel):
    hypothesis: Hypothesis
    experiment_result: Dict[str, Any]

class RunRegressionRequest(BaseModel):
    patched_code: str

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "VibeStepper Backend"
    }

# API端点实现
@app.post("/api/generate-mre")
async def generate_mre(request: GenerateMRERequest):
    """生成最小可复现用例 (MRE)"""
    logger.info(f"生成MRE请求: {request.bug_report.title}")
    
    try:
        # 这里可以集成AI模型来生成真实的MRE
        # 目前返回基于bug报告的模拟MRE
        
        mre_code = f"""# 最小可复现用例 - {request.bug_report.title}
# 基于错误: {request.bug_report.error_message}

def process_items(items):
    \"\"\"处理项目列表的函数\"\"\"
    print(f"开始处理 {{len(items)}} 个项目")
    
    # 这里是导致错误的代码
    for i in range(len(items) + 1):  # Bug: 应该是 len(items)
        try:
            item = items[i]
            print(f"处理项目 {{i}}: {{item}}")
        except IndexError as e:
            print(f"错误发生在索引 {{i}}: {{e}}")
            raise

def main():
    \"\"\"主函数 - 复现bug\"\"\"
    test_data = ["项目A", "项目B", "项目C"]
    print("=== 开始复现bug ===")
    process_items(test_data)

if __name__ == "__main__":
    main()
"""
        
        return {
            "mre_code": mre_code,
            "can_reproduce": True,
            "confidence": 0.9,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"生成MRE失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成MRE失败: {str(e)}")

@app.post("/api/analyze-root-cause")
async def analyze_root_cause(request: AnalyzeRootCauseRequest):
    """分析根本原因"""
    logger.info(f"分析根因请求: {request.bug_report.title}")
    
    try:
        # 基于错误信息生成假设
        hypotheses = []
        
        if "IndexError" in request.bug_report.error_message:
            hypotheses.extend([
                {
                    "description": "循环边界错误: range(len(items)+1) 应该是 range(len(items))",
                    "evidence": f"堆栈跟踪显示 {request.bug_report.stack_trace[0] if request.bug_report.stack_trace else '未知位置'}",
                    "confidence": 0.85
                },
                {
                    "description": "空列表处理不当",
                    "evidence": "可能传入了空列表导致索引访问失败",
                    "confidence": 0.65
                }
            ])
        
        if "list" in request.bug_report.error_message.lower():
            hypotheses.append({
                "description": "列表状态异常: 并发访问或意外修改",
                "evidence": "多线程环境下列表可能被意外修改",
                "confidence": 0.45
            })
        
        # 如果没有特定的假设，提供通用假设
        if not hypotheses:
            hypotheses = [
                {
                    "description": "代码逻辑错误",
                    "evidence": f"错误信息: {request.bug_report.error_message}",
                    "confidence": 0.7
                },
                {
                    "description": "输入数据异常",
                    "evidence": "可能是输入参数不符合预期",
                    "confidence": 0.6
                }
            ]
        
        return {
            "hypotheses": hypotheses,
            "analysis_method": "基于错误模式的启发式分析",
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"根因分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"根因分析失败: {str(e)}")

@app.post("/api/generate-instrumentation")
async def generate_instrumentation(request: GenerateInstrumentationRequest):
    """生成插桩方案"""
    logger.info(f"生成插桩方案: {request.hypothesis.description}")
    
    try:
        instrumentations = []
        
        if "循环" in request.hypothesis.description or "range" in request.hypothesis.description:
            instrumentations.extend([
                "在循环入口添加: print(f'循环范围: i={i}, len(items)={len(items)}')",
                "在索引访问前添加: assert i < len(items), f'索引越界: {i} >= {len(items)}'",
                "在函数入口添加: print(f'输入参数: items={items}, 长度={len(items)}')"
            ])
        
        if "空列表" in request.hypothesis.description:
            instrumentations.extend([
                "在函数开始添加: if not items: print('警告: 输入列表为空')",
                "添加长度检查: print(f'列表长度检查: {len(items)}')"
            ])
        
        if "并发" in request.hypothesis.description:
            instrumentations.extend([
                "添加线程安全检查: import threading; print(f'当前线程: {threading.current_thread().name}')",
                "添加状态快照: print(f'列表状态快照: {items.copy()}')"
            ])
        
        # 默认插桩
        if not instrumentations:
            instrumentations = [
                "添加调试输出: print(f'调试信息: 当前状态')",
                "添加异常捕获: try-except 包装关键代码"
            ]
        
        return {
            "instrumentations": instrumentations,
            "instrumentation_type": "最小侵入式",
            "estimated_overhead": "< 5%",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"生成插桩方案失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成插桩方案失败: {str(e)}")

@app.post("/api/run-experiment")
async def run_experiment(request: RunExperimentRequest):
    """运行实验"""
    logger.info(f"运行实验，插桩数量: {len(request.instrumentations)}")
    
    try:
        # 模拟实验执行
        output_lines = [
            "[实验开始] 执行插桩代码",
            "[LOG] 输入参数: items=['项目A', '项目B', '项目C'], 长度=3",
            "[LOG] 循环范围: i=0, len(items)=3",
            "[LOG] 循环范围: i=1, len(items)=3", 
            "[LOG] 循环范围: i=2, len(items)=3",
            "[LOG] 循环范围: i=3, len(items)=3",
            "[ERROR] 索引越界: 3 >= 3",
            "[EXCEPTION] IndexError: list index out of range",
            "[实验结束] 成功复现问题"
        ]
        
        # 模拟覆盖率数据
        coverage_data = {
            "case_001": 85,
            "case_002": 90,
            "case_003": 75,  # 失败的测试用例
            "case_004": 88,
            "total_lines": 50,
            "covered_lines": 42
        }
        
        return {
            "output": "\n".join(output_lines),
            "coverage": coverage_data,
            "root_cause_confirmed": True,
            "execution_time": "2.3s",
            "experiment_id": f"exp_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "executed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"实验执行失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"实验执行失败: {str(e)}")

@app.post("/api/generate-patch")
async def generate_patch(request: GeneratePatchRequest):
    """生成补丁"""
    logger.info(f"生成补丁: {request.hypothesis.description}")
    
    try:
        # 基于假设生成补丁
        if "循环边界" in request.hypothesis.description:
            patch = {
                "old_code": "for i in range(len(items) + 1):",
                "new_code": "for i in range(len(items)):",
                "file_path": "buggy.py",
                "line_number": 42,
                "patch_type": "循环边界修复"
            }
        else:
            patch = {
                "old_code": "# 原始代码",
                "new_code": "# 修复后代码", 
                "file_path": "unknown.py",
                "line_number": 1,
                "patch_type": "通用修复"
            }
        
        impact_analysis = [
            "影响的测试用例: case_001, case_002, case_003, case_004",
            "影响的函数: process_items()",
            "潜在副作用: 无",
            "向后兼容性: 完全兼容"
        ]
        
        return {
            "patch": patch,
            "impact_analysis": impact_analysis,
            "confidence": 0.9,
            "patch_size": "1 line changed",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"生成补丁失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成补丁失败: {str(e)}")

@app.post("/api/run-regression")
async def run_regression(request: RunRegressionRequest):
    """运行回归测试"""
    logger.info("运行回归测试")
    
    try:
        # 模拟回归测试结果
        test_results = {
            "case_001": "passed",
            "case_002": "passed", 
            "case_003": "passed",  # 之前失败的现在通过了
            "case_004": "passed",
            "fuzz_test_10x": "passed",
            "performance_test": "passed"
        }
        
        passed_tests = sum(1 for result in test_results.values() if result == "passed")
        total_tests = len(test_results)
        
        return {
            "test_results": test_results,
            "all_passed": passed_tests == total_tests,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "execution_time": "15.7s",
            "test_coverage": "94%",
            "executed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"回归测试失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"回归测试失败: {str(e)}")

# 启动服务器
if __name__ == "__main__":
    print("🚀 启动 VibeStepper 后端服务...")
    print("📡 API文档: http://localhost:8000/docs")
    print("🔍 健康检查: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
