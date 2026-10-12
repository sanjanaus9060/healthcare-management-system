import os

if os.environ.get("TESTING") == "1":
    from mongomock_motor import AsyncMongoMockClient

    client = AsyncMongoMockClient()
else:
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])

db = client[os.environ["DB_NAME"]]


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("patient_id", unique=True, sparse=True)
    await db.health_cards.create_index("patient_user_id", unique=True)
    await db.health_cards.create_index("qr_token", unique=True)
    await db.appointments.create_index("id", unique=True)
    await db.appointments.create_index("slot_lock", unique=True, sparse=True)
    await db.medical_records.create_index("patient_user_id")
    await db.login_attempts.create_index("identifier")
    await db.ai_messages.create_index("user_id")
    await db.files.create_index("id", unique=True)
    await db.access_controls.create_index([("patient_user_id", 1), ("doctor_user_id", 1)], unique=True)
