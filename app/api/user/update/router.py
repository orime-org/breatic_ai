from fastapi import APIRouter
from fastapi.responses import JSONResponse

update_router = APIRouter()

@update_router.get('/update')
async def operator():
    return JSONResponse(content={
        "code": 0,
        "data": None,
        "msg": "",
    })