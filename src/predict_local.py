import joblib
import pandas as pd

model_path="models/aqi_model.pkl"
data_path="data/raw/delhi_pm25.csv"
datetime_column="period.datetimeFrom.utc"
pm_column="value"

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

    X_latest=pd.DataFrame([{
        "pm25":latest["pm25"],
        "roll_3":latest["roll_3"],
        "roll_6":latest["roll_6"],
        "roll_12":latest["roll_12"]
    }])

    return X_latest

def predict():
    model=joblib.load(model_path)
    X=load_latest_features()
    prediction=model.predict(X)[0]
    print("Predicted PM2.5 value for next 24 hours:", round(prediction,2))

if __name__=="__main__":
    predict()