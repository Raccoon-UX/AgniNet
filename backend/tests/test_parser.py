import pytest
from app.services.parser import parse_firms_csv, compute_kpis

# Sample actual NASA FIRMS MODIS CSV format
SAMPLE_MODIS_CSV = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-9.428,-54.887,368.1,1.4,1.0,2026-11-14,0418,Aqua,MODIS,88,6.1N,298.5,385.0,N
-7.892,-62.341,334.0,0.8,1.0,2026-11-14,0210,Terra,MODIS,76,6.1N,292.0,88.2,N
"""

# Sample actual NASA FIRMS VIIRS CSV format
SAMPLE_VIIRS_CSV = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-9.4215,-54.8912,382.4,1.1,0.38,2026-11-14,0415,1,VIIRS,h,2.0-NRT,301.2,412.8,N
-16.4820,-56.6340,398.2,1.6,0.38,2026-11-14,0430,2,VIIRS,n,1.0-NRT,304.7,560.4,N
"""


def test_parse_modis_csv():
    obs = parse_firms_csv(SAMPLE_MODIS_CSV, "MODIS_NRT")
    assert len(obs) == 2
    first = obs[0]
    assert first.instrument == "MODIS"
    assert first.latitude == -9.428
    assert first.longitude == -54.887
    assert first.satellite == "Aqua"
    assert first.confidence == 88
    assert first.confidence_numeric == 88.0
    assert first.brightness_kelvin == 368.1
    assert first.bright_t31_kelvin == 298.5
    assert first.frp_mw == 385.0
    assert first.day_night == "N"
    assert first.acquisition_time_utc == "04:18"
    assert first.is_live is True


def test_parse_viirs_csv():
    obs = parse_firms_csv(SAMPLE_VIIRS_CSV, "VIIRS_NOAA20_NRT")
    assert len(obs) == 2
    first = obs[0]
    assert first.instrument == "VIIRS"
    assert first.satellite == "NOAA-20"  # '1' normalized to NOAA-20
    assert first.confidence == "high"  # 'h' mapped to high
    assert first.confidence_numeric == 90.0
    assert first.brightness_kelvin == 382.4  # bright_ti4 mapped
    assert first.bright_t31_kelvin == 301.2  # bright_ti5 mapped
    assert first.frp_mw == 412.8

    second = obs[1]
    assert second.satellite == "NOAA-21"  # '2' normalized to NOAA-21
    assert second.confidence == "nominal"  # 'n' mapped to nominal


def test_deduplication():
    # Duplicate record in text
    duplicate_csv = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
38.892,-120.412,362.4,1.4,1.0,2026-11-14,0315,Aqua,MODIS,89,6.1N,297.0,320.0,N
38.892,-120.412,362.4,1.4,1.0,2026-11-14,0315,Aqua,MODIS,89,6.1N,297.0,320.0,N
"""
    obs = parse_firms_csv(duplicate_csv, "MODIS_NRT")
    assert len(obs) == 1


def test_compute_kpis():
    obs = parse_firms_csv(SAMPLE_MODIS_CSV, "MODIS_NRT")
    kpis = compute_kpis(obs)
    assert kpis.total_hotspots == 2
    assert kpis.modis_count == 2
    assert kpis.viirs_count == 0
    assert kpis.total_frp_mw == round(385.0 + 88.2, 1)
    assert kpis.nighttime_count == 2
    assert kpis.daytime_count == 0
