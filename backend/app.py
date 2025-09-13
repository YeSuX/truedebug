from fastapi import FastAPI, Body
from backend.steps import utils, step_one, step_two, step_three, step_four, step_five


app = FastAPI()

# ===== 简单内存缓存，key 可以是用户 id 或 session id =====
# 实际生产建议用 Redis 或类似缓存
step1_cache: dict[str, dict] = {}
step2_cache: dict[str, dict] = {}
step3_cache: dict[str, dict] = {}
step4_cache: dict[str, dict] = {}
step5_cache: dict[str, dict] = {}

@app.post("/step1")
async def step1_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code1: {ode}')
    # # 输入"1", "2"
    # choice = data.get("choice")  # 前端可能传 choice
    # print(f'Received choice1: {choice}')
    user_id: str = data.get("user_id")  # 前端必须传 user_id 来区分用户
    print(f'user_id: {user_id}')

    if not user_id:
        return {"error": "必须提供 user_id"}
    
    # result = await step_one.handle_step1(ode, choice)
    result = await step_one.handle_step1(ode)


    # if choice is None or choice == "1":
    step1_cache[user_id] = result  # 保存 step1 输出，用于 step2

    return {"result": result}
    # return {"result": await step_one.run_step1(data["code"])}

@app.post("/step2")
async def step2_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code2: {ode}')
    # 输入"1", "2"
    choice = data.get("choice")  # 前端可能传 choice
    print(f'Received choice2: {choice}')

    user_id: str = data.get("user_id")
    if not user_id:
        return {"error": "必须提供 user_id"}
    
    step1_output = step1_cache.get(user_id)
    if step1_output is None:
        return {"error": "未找到步骤 1 输出，请先执行 step1"}

    result = await step_one.handle_step2(ode, step1_output, choice)

    step2_cache[user_id] = result  # 保存 step2 输出，用于后续步骤
    print(f"user_id={user_id}, step2_cache keys={list(step2_cache.keys())}")

    return {"result": result}

@app.post("/step3")
async def step3_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code3: {ode}')
    # 输入"a", "b"
    choice = data.get("choice")  # 前端可能传 choice
    print(f'Received choice3: {choice}')

    user_id: str = data.get("user_id")
    if not user_id:
        return {"error": "必须提供 user_id"}
    
    # 获取步骤二中得到的假设成因
    step2_output = step2_cache.get(user_id)
    hypothesis = utils.extract_hypothesis(step2_output, choice)

    if hypothesis is None:
        return {"error": "未找到步骤 2 输出，请先执行 step2"}

    result = await step_three.handle_step3(ode, hypothesis, choice)

    step3_cache[user_id] = result  # 保存 step3 输出，用于后续步骤
    return {"result": result}

@app.post("/step4")
async def step4_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code4: {ode}')
    # 输入"1", "2"
    # "1"表示全部采纳，todo: "2"表示自定义组合--这个先不实现，有点难
    choice = data.get("choice")  # 前端可能传 choice
    print(f'Received choice4: {choice}')

    user_id: str = data.get("user_id")
    if not user_id:
        return {"error": "必须提供 user_id"}
    
    # 获取步骤二中得到的假设成因
    step2_output = step2_cache.get(user_id)
    hypothesis = utils.extract_hypothesis(step2_output, choice)

    # 获取步骤三中的插桩计划
    step3_output = step3_cache.get(user_id)

    if step3_output is None:
        return {"error": "未找到步骤 3 输出，请先执行 step3"}

    result = await step_four.handle_step4(ode, hypothesis, step3_output, choice)

    step4_cache[user_id] = result  # 保存 step4 输出，用于后续步骤
    return {"result": result}

@app.post("/step5")
async def step5_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code5: {ode}')
    # 输入"1", "2"
    # "1"表示是，"2"表示否
    choice = data.get("choice")  # 前端可能传 choice
    print(f'Received choice4: {choice}')

    user_id: str = data.get("user_id")
    if not user_id:
        return {"error": "必须提供 user_id"}
    
    # 获取步骤二中得到的假设成因
    step2_output = step2_cache.get(user_id)
    hypothesis = utils.extract_hypothesis(step2_output, choice)

    # 获取步骤三中的插桩计划
    step3_output = step3_cache.get(user_id)

    # 获取步骤四中的修复补丁
    step4_output = step4_cache.get(user_id)

    if step4_output is None:
        return {"error": "未找到步骤 4 输出，请先执行 step4"}

    result = await step_five.handle_step5(ode, hypothesis, step3_output, step4_output, choice)

    step5_cache[user_id] = result  # 保存 step4 输出，用于后续步骤
    return {"result": result}

@app.post("/step6")
async def step6_endpoint(data: dict = Body(...)):
    ode = data.get("code")
    print(f'Received code5: {ode}')

    user_id: str = data.get("user_id")
    if not user_id:
        return {"error": "必须提供 user_id"}  

    # 获取步骤一中的最小化可复现用例
    step1_output = step1_cache.get(user_id)
 
    # 获取步骤三中的插桩计划
    step3_output = step3_cache.get(user_id)

    # 获取步骤四中的修复补丁
    step4_output = step4_cache.get(user_id)

    # 获取步骤五中的回归测试
    step5_output = step5_cache.get(user_id)

    step2_output = {"hypothesis": step3_output.get("hypothesis")} if isinstance(step3_output, dict) else None

    result = {
        "step": "Step 6/6",
        "summary": {
            "step1_minimal_case": step1_output,
            "step2_hypothesis": step2_output,
            "step3_instrument_plan": step3_output,
            "step4_fix_patch": step4_output,
            "step5_regression": step5_output,
        }
    }

    return {"result": result}
