from services.cos_service import upload_to_cos, get_presigned_url

local_path = "uploads/test.txt"
object_key = "test/test.txt"

with open(local_path, "w", encoding="utf-8") as f:
    f.write("hello cos")

public_path = upload_to_cos(local_path, object_key)
signed_url = get_presigned_url(object_key)

print("uploaded path:", public_path)
print("signed url:", signed_url)