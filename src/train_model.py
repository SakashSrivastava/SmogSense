import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

Data_path="data/raw/delhi_pm25.csv"

datetimecolumn="period.datetimeFrom.utc"
pm_column="value"
modelpath="models/aqi_model.pkl"

def load_and_prepare_data():
    df=pd.read_csv(Data_path)
    df[datetimecolumn]=pd.to_datetime(df[datetimecolumn])
    df=df.sort_values(datetimecolumn)
    df=df[[datetimecolumn, pm_column]].dropna()
    df=df.rename(columns={pm_column: "pm25"})

    df["target"]=df["pm25"].shift(-24)
    df=df.dropna()

    df["roll_3"]=df["pm25"].rolling(window=3).mean()
    df["roll_6"]=df["pm25"].rolling(window=6).mean()
    df["roll_12"]=df["pm25"].rolling(window=12).mean()

    df=df.dropna()

    x=df[["pm25","roll_3","roll_6","roll_12"]]
    y=df["target"]

    return x,y

def train_model():
    X,y=load_and_prepare_data()
    X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2,shuffle=False)
    model=RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train,y_train)   

    predictions=model.predict(X_test)
    mae=mean_absolute_error(y_test,predictions)
    print("Mean absolute error:", round(mae,2))

    os.makedirs("models",exist_ok=True)
    joblib.dump(model,modelpath) 

    print("Model saved to:", modelpath)

if __name__=="__main__":
    train_model()