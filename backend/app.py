from fastapi import FastAPI, Body
# from steps import step_one, step_two, step_three, step_four, step_five, step_six
from backend.steps import step_one, step_two


app = FastAPI()

@app.post("/step1")
async def step1_endpoint(data: dict = Body(...)):
    return {"result": await step_one.run_step1(data["code"])}

# @app.post("/step2")
# async def step2_endpoint(data: dict = Body(...)):
#     return {"result": await step_two.run_step2(data["code"], data["choice"])}

# @app.post("/step3")
# async def step3_endpoint(data: dict = Body(...)):
#     return {"result": await step_three.run_step3(data["code"], data["choice"])}

# @app.post("/step4")
# async def step4_endpoint(data: dict = Body(...)):
#     return {"result": await step_four.run_step4(data["code"], data["choice"])}

# @app.post("/step5")
# async def step5_endpoint(data: dict = Body(...)):
#     return {"result": await step_five.run_step5(data["code"], data["choice"])}

# @app.post("/step6")
# async def step6_endpoint(data: dict = Body(...)):
#     return {"result": await step_six.run_step6(data["code"])}
