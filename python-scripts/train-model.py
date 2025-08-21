import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
import pickle

# Load the dataset
print("Loading dataset...")
df = pd.read_csv('GDM_UOS_NoC.csv')
print(f"Dataset loaded with {len(df)} rows and {len(df.columns)} columns")

# Clean column names (remove spaces and special characters)
df.columns = [
    'oneHourGlucose', 'bpSystolic', 'bmiBaseline', 'fastingBloodGlucose',
    'weightKg', 'pulseHeartRate', 'hypertensiveDisorders', 'typeOfTreatment',
    'twoHourGlucose', 'nationality', 'ageYears', 'bpDiastolic', 'height',
    'weightGainDuringPregnancy', 'GDM'
]

# Handle missing values - fill with 0 for simplicity
df = df.fillna(0)

# Separate features and target
X = df.drop('GDM', axis=1)
y = df['GDM']

print(f"Features shape: {X.shape}")
print(f"Target distribution: {y.value_counts().to_dict()}")

# Handle categorical columns
categorical_columns = ['hypertensiveDisorders', 'typeOfTreatment', 'nationality']

for col in categorical_columns:
    if col in X.columns:
        # Simple label encoding
        le = LabelEncoder()
        # Convert to string first to handle any numeric values
        X[col] = X[col].astype(str)
        X[col] = le.fit_transform(X[col])

# Handle numerical columns - convert to numeric and fill NaN with 0
numerical_columns = [col for col in X.columns if col not in categorical_columns]
for col in numerical_columns:
    X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)

print("Data preprocessing completed")

# Scale the features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("Features scaled")

# Create and train the XGBoost model (very simple - no parameters)
model = XGBClassifier()
model.fit(X_scaled, y)

print("Model training completed")

# Save the model
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved as 'model.pkl'")

# Save the scaler
with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("Scaler saved as 'scaler.pkl'")

# Test the model quickly
accuracy = model.score(X_scaled, y)
print(f"Training accuracy: {accuracy:.4f}")

# Make a simple prediction test
sample_prediction = model.predict(X_scaled[:1])
sample_probability = model.predict_proba(X_scaled[:1])
print(f"Sample prediction: {sample_prediction[0]}")
print(f"Sample probability: {sample_probability[0]}")

print("\nModel creation completed successfully!")
print("Files created:")
print("- model.pkl (XGBoost model)")
print("- scaler.pkl (StandardScaler)")
print("\nYou can now use these files with your Flask API!")