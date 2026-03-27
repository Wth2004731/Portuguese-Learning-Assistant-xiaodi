import os
from qcloud_cos import CosConfig, CosS3Client
from dotenv import load_dotenv

load_dotenv()

SECRET_ID = os.getenv("COS_SECRET_ID")
SECRET_KEY = os.getenv("COS_SECRET_KEY")
REGION = os.getenv("COS_REGION")
BUCKET = os.getenv("COS_BUCKET_NAME")
BUCKET_DOMAIN = os.getenv("COS_BUCKET_DOMAIN")

if not SECRET_ID:
    raise ValueError("COS_SECRET_ID 未配置，请检查 .env 文件")
if not SECRET_KEY:
    raise ValueError("COS_SECRET_KEY 未配置，请检查 .env 文件")
if not REGION:
    raise ValueError("COS_REGION 未配置，请检查 .env 文件")
if not BUCKET:
    raise ValueError("COS_BUCKET_NAME 未配置，请检查 .env 文件")
if not BUCKET_DOMAIN:
    raise ValueError("COS_BUCKET_DOMAIN 未配置，请检查 .env 文件")

config = CosConfig(
    Region=REGION,
    SecretId=SECRET_ID,
    SecretKey=SECRET_KEY,
    Scheme="https"
)
client = CosS3Client(config)

def upload_to_cos(local_path: str, object_key: str) -> str:
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"本地文件不存在: {local_path}")

    object_key = object_key.lstrip("/")

    with open(local_path, "rb") as fp:
        client.put_object(
            Bucket=BUCKET,
            Body=fp,
            Key=object_key,
            EnableMD5=False
        )

    return f"{BUCKET_DOMAIN.rstrip('/')}/{object_key}"

def get_presigned_url(object_key: str, expired: int = 3600) -> str:
    object_key = object_key.lstrip("/")

    return client.get_presigned_url(
        Method="GET",
        Bucket=BUCKET,
        Key=object_key,
        Expired=expired
    )