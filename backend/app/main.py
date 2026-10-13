from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database.db_connection import DB_connection
from routes import user_routes
from routes import test_routes
from routes import sentence_routes
from routes import auth_routes

connection = DB_connection()


@asynccontextmanager
async def lifespan(app: FastAPI):
    connection.create_database()
    connection.create_tables()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_routes.router, prefix="/users")
app.include_router(test_routes.router, prefix="/tests")
app.include_router(sentence_routes.router, prefix="/sentences")
app.include_router(auth_routes.router, prefix="/auth")

if __name__ == "__main__":
    uvicorn.run("main:app", port=8000, reload=True)
