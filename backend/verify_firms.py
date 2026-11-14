import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import httpx

# 1. Load backend/.env securely
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

map_key = os.getenv("NASA_FIRMS_MAP_KEY", "").strip()

print("=" * 60)
print("AGYNET — NASA FIRMS LIVE API VERIFICATION")
print("=" * 60)

if not map_key or map_key.lower() in {"your_firms_map_key_here", "demo", "placeholder", "none"}:
    print("[STATUS] NASA_FIRMS_MAP_KEY is NOT configured or is placeholder.")
    print("[MODE] System operational status: DEMO_FALLBACK.")
    sys.exit(0)

# Never print the actual MAP_KEY
masked_key = map_key[:4] + "*" * (len(map_key) - 8) + map_key[-4:] if len(map_key) > 8 else "***"
print(f"[STATUS] NASA_FIRMS_MAP_KEY is CONFIGURED.")
print(f"[KEY INFO] Length: {len(map_key)} characters | Masked: {masked_key}")

base_url = "https://firms.modaps.eosdis.nasa.gov/api"

# 2. Test Availability / Transaction Status Endpoint
avail_url = f"{base_url}/data_availability/csv/{map_key}/ALL"
print("\n--- 1. Testing Key Status & Data Availability ---")
try:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(avail_url)
        print(f"HTTP Status: {resp.status_code}")
        if resp.status_code == 200:
            lines = resp.text.strip().splitlines()
            print(f"Response: Success ({len(lines)} sources available)")
            for line in lines[:5]:
                print(f"  {line}")
        elif resp.status_code == 403 or "Invalid" in resp.text:
            print(f"Auth Result: 403 Unauthorized / Invalid MAP_KEY. Response text: {resp.text.strip()[:100]}")
        else:
            print(f"Status: {resp.status_code} - {resp.text.strip()[:100]}")
except Exception as e:
    print(f"Connection Exception: {e}")

# 3. Test Live VIIRS Request
# Use a known active fire bounding box: Western US / California (-125, 32, -114, 42)
print("\n--- 2. Testing Live VIIRS Query (VIIRS_NOAA20_NRT) ---")
viirs_source = "VIIRS_NOAA20_NRT"
extent = "-125,32,-114,42"
viirs_url = f"{base_url}/area/csv/{map_key}/{viirs_source}/{extent}/1"

try:
    with httpx.Client(timeout=15.0) as client:
        resp_viirs = client.get(viirs_url)
        print(f"VIIRS HTTP Status: {resp_viirs.status_code}")
        if resp_viirs.status_code == 200:
            lines = resp_viirs.text.strip().splitlines()
            header = lines[0] if lines else "None"
            record_count = max(0, len(lines) - 1)
            print(f"Sensor Feed: {viirs_source}")
            print(f"Records Returned: {record_count}")
            print(f"CSV Header: {header}")
            if record_count > 0:
                print(f"Sample Record: {lines[1]}")
        else:
            print(f"Error {resp_viirs.status_code}: {resp_viirs.text.strip()[:150]}")
except Exception as e:
    print(f"Connection Exception: {e}")

# 4. Test Live MODIS Request
print("\n--- 3. Testing Live MODIS Query (MODIS_NRT) ---")
modis_source = "MODIS_NRT"
modis_url = f"{base_url}/area/csv/{map_key}/{modis_source}/{extent}/1"

try:
    with httpx.Client(timeout=15.0) as client:
        resp_modis = client.get(modis_url)
        print(f"MODIS HTTP Status: {resp_modis.status_code}")
        if resp_modis.status_code == 200:
            lines = resp_modis.text.strip().splitlines()
            header = lines[0] if lines else "None"
            record_count = max(0, len(lines) - 1)
            print(f"Sensor Feed: {modis_source}")
            print(f"Records Returned: {record_count}")
            print(f"CSV Header: {header}")
            if record_count > 0:
                print(f"Sample Record: {lines[1]}")
        else:
            print(f"Error {resp_modis.status_code}: {resp_modis.text.strip()[:150]}")
except Exception as e:
    print(f"Connection Exception: {e}")

print("=" * 60)
