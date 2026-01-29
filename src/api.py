from fastapi import FastAPI
import joblib
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

model_path="models/aqi_model.pkl"
data_path="data/raw/delhi_pm25.csv"
datetime_column="period.datetimeFrom.utc"
pm_column="value"

app=FastAPI(title="SmogSense API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model=joblib.load(model_path)

def pm25_to_aqi_category(pm25):
    """
    Convert PM2.5 concentration to AQI category.
    Based on WHO/EPA standards.
    """
    if pm25 <= 12:
        return "Good"
    elif pm25 <= 35.4:
        return "Moderate"
    elif pm25 <= 55.4:
        return "Unhealthy for Sensitive Groups"
    elif pm25 <= 150.4:
        return "Unhealthy"
    elif pm25 <= 250.4:
        return "Very Unhealthy"
    else:
        return "Hazardous"

def load_latest_features():
    df=pd.read_csv(data_path)
    df[datetime_column]=pd.to_datetime(df[datetime_column])
    df=df.sort_values(datetime_column)
    df=df[[datetime_column, pm_column]].dropna()
    df=df.rename(columns={pm_column:"pm25"})

    df["roll_3"]=df["pm25"].rolling(window=3).mean()
    df["roll_6"]=df["pm25"].rolling(window=6).mean()
    df["roll_12"]=df["pm25"].rolling(window=12).mean()
    df=df.dropna()

    latest=df.iloc[-1]
    X=pd.DataFrame([{
        "pm25":latest["pm25"],
        "roll_3":latest["roll_3"],
        "roll_6":latest["roll_6"],
        "roll_12":latest["roll_12"]
    }])
    return X


@app.get("/")
def root():
    return{"status":"SmogSense API running"}

@app.get("/predict")
def predict():
    df=pd.read_csv(data_path)
    df[datetime_column]=pd.to_datetime(df[datetime_column])
    df=df.sort_values(datetime_column)
    df=df[[datetime_column, pm_column]].dropna()
    df=df.rename(columns={pm_column:"pm25"})

    df["roll_3"]=df["pm25"].rolling(window=3).mean()
    df["roll_6"]=df["pm25"].rolling(window=6).mean()
    df["roll_12"]=df["pm25"].rolling(window=12).mean()
    df=df.dropna()

    latest_row=df.iloc[-1].copy()
    current_pm25=float(latest_row["pm25"])
    
    # Generate 7-day forecast
    predictions_7day=[]
    
    pm25_history=[latest_row["pm25"], latest_row["roll_3"], latest_row["roll_6"], latest_row["roll_12"]]
    
    for day in range(1, 8):
        X=pd.DataFrame([{
            "pm25":pm25_history[0],
            "roll_3":pm25_history[1],
            "roll_6":pm25_history[2],
            "roll_12":pm25_history[3]
        }])
        
        predicted_pm25=float(model.predict(X)[0])
        predictions_7day.append({
            "day":day,
            "pm25":round(predicted_pm25, 2),
            "aqi_category":pm25_to_aqi_category(predicted_pm25)
        })
        
        # Update history for next iteration
        pm25_history[0]=predicted_pm25
        pm25_history[1]=(pm25_history[1]*2 + predicted_pm25)/3  # Update 3-day rolling avg
        pm25_history[2]=(pm25_history[2]*5 + predicted_pm25)/6  # Update 6-day rolling avg
        pm25_history[3]=(pm25_history[3]*11 + predicted_pm25)/12  # Update 12-day rolling avg

    return{
        "current_pm25":round(current_pm25, 2),
        "current_aqi_category":pm25_to_aqi_category(current_pm25),
        "forecast_7day":predictions_7day
    }