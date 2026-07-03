import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import joblib

# 1. Generate realistic historical training data
np.random.seed(42)
n_samples = 2000

data = {
    # 0 = Routine, 1 = Urgent, 2 = Critical
    'triage_level': np.random.choice([0, 1, 2], size=n_samples, p=[0.5, 0.3, 0.2]),
    # Current number of people ahead in the queue
    'queue_length': np.random.randint(1, 20, size=n_samples),
    # Time of day indicator: 0 = Off-peak, 1 = Peak Hour Rush
    'peak_hour': np.random.choice([0, 1], size=n_samples, p=[0.7, 0.3])
}

df = pd.DataFrame(data)

# 2. Formula for actual wait time (Base 10 mins + 12 mins per queue patient + 8 mins if peak hour + triage penalty)
df['actual_wait_time'] = 10 + (df['queue_length'] * 12) + (df['peak_hour'] * 8) - (df['triage_level'] * 3) + np.random.normal(0, 2, n_samples)

# 3. Train the model
X = df[['triage_level', 'queue_length', 'peak_hour']]
y = df['actual_wait_time']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)

# 4. Save the trained intelligence asset
joblib.dump(model, 'wait_time_model.pkl')
print("✅ Machine Learning model trained and saved successfully!")