from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

# Load the saved model file
model = joblib.load('wait_time_model.pkl')

class PredictionPayload(BaseModel):
    triage_level: int  # 0: Routine, 1: Urgent, 2: Critical
    queue_length: int
    peak_hour: int      # 0 or 1

@app.post("/predict")
def predict_wait_time(data: PredictionPayload):
    # Format layout for model inference
    features = np.array([[data.triage_level, data.queue_length, data.peak_hour]])
    
    # Run prediction
    prediction = model.predict(features)[0]
    
    # Bound the output so it never returns an impossible negative number
    final_eta = max(1, int(round(prediction)))
    
    return {"predicted_wait_time_mins": final_eta}