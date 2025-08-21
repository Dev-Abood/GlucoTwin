# flask imports, request to receive form data, jsonify to return results in json form
from flask import Flask, request, jsonify 
from flask_cors import CORS # CORS for enabling Next.js application communication
# python libraries needed
import pandas as pd
import numpy as np
import pickle
import os
import logging
from datetime import datetime

# configure logging system to send information and display errors
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js application

class GDMPredictor:
    def __init__(self, model_path='/python-scripts/model.pkl', scaler_path='/python-scripts/scaler.pkl'):
        # Initialize predictor variables
        self.model = None 
        self.scaler = None
        self.encoder = None
        self.model_path = model_path # defining the paths
        self.scaler_path = scaler_path

        self.feature_columns = [ # listing all features 
            'oneHourGlucose', 'bpSystolic', 'bmiBaseline', 'fastingBloodGlucose',
            'weightKg', 'pulseHeartRate', 'hypertensiveDisorders', 'typeOfTreatment',
            'twoHourGlucose', 'nationality', 'ageYears', 'bpDiastolic', 'height',
            'weightGainDuringPregnancy'
        ]
        
        self.load_model() # function to the load the model pkl file
        self.load_scaler() # function to load the StandardScaler() pkl file

    def load_scaler(self):
        # error checking for scaler path
        try:
            if os.path.exists(self.scaler_path):
                with open(self.scaler_path, 'rb') as file:
                    self.scaler = pickle.load(file)
                logger.info(f"Scaler loaded successfully from {self.scaler_path}")
                return True
            else:
                logger.warning(f"Scaler file not found at {self.scaler_path}, will skip scaling")
                self.scaler = None
                return False
        except Exception as e:
            logger.error(f"Error loading scaler: {str(e)}")
            self.scaler = None
            return False

    def load_model(self):
        """Load the pre-trained model from pickle file"""
        try:
            # error checking the pickle file path, name is "model.pkl"
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as file:
                    self.model = pickle.load(file) # load the model
                # log success message
                logger.info(f"model is loaded successfully from path: {self.model_path}")
                return True
            else:
                # in case of error (model path does not exist):
                logger.error(f"model file path for {self.model_path} is not found, please make sure it exists")
                return False
        except Exception as e:
            # in case of server / client computer error
            logger.error(f"Error loading model: {str(e)}") # log the error
            return False

    def preprocess_input(self, patient_data):
        """Function for preprocessing the data"""
        try:
            gdm_df = pd.DataFrame([patient_data])
            mapping = { # map frontend field names to model expected names
                # reference to the dataset
                'oneHourGlucose': 'oneHourGlucose',
                'bpSystolic': 'bpSystolic',
                'bmiBaseline': 'bmiBaseline',
                'fastingBloodGlucose': 'fastingBloodGlucose',
                'weightKg': 'weightKg',
                'pulseHeartRate': 'pulseHeartRate',
                'hypertensiveDisorders': 'hypertensiveDisorders',
                'typeOfTreatment': 'typeOfTreatment',
                'twoHourGlucose': 'twoHourGlucose',
                'nationality': 'nationality',
                'ageYears': 'ageYears',
                'bpDiastolic': 'bpDiastolic',
                'height': 'height',
                'weightGainDuringPregnancy': 'weightGainDuringPregnancy'
            }

            
            processed_data = {} # Rename columns to match model expectations
            for frontend_key, model_key in mapping.items():
                if frontend_key in patient_data:
                    processed_data[model_key] = patient_data[frontend_key]

            gdm_df = pd.DataFrame([processed_data]) # place mapped feature columns in a dataframe object

            # Ensure numerical columns are properly typed
            numerical_columns = [
                'oneHourGlucose', 'bpSystolic', 'bmiBaseline', 'fastingBloodGlucose',
                'weightKg', 'pulseHeartRate', 'twoHourGlucose', 'ageYears', 
                'bpDiastolic', 'height', 'weightGainDuringPregnancy'
            ]
            for col in numerical_columns:
                if col in gdm_df.columns:
                    gdm_df[col] = pd.to_numeric(gdm_df[col], errors='coerce').fillna(0)
                    
            
            # convert categorical columns to numeric as expected by model
            categorical_mappings = {
                #! manually editing them is better practice
                'hypertensiveDisorders': {
                    'No': 0, 'no': 0, 'NO': 0, 'Nil': 0,
                    'Yes': 1, 'yes': 1, 'Yes ': 1
                },
                'typeOfTreatment': {
                    'No Treatment': 0,
                    'Metformin': 1, 'metformin': 1, 'metformin ': 1, 
                    'Metformin ': 1, 'MetFORMIN': 1,
                    '750, 500, 750': 2, 'yes 1000BD': 2, 'yes 500 od': 2, 'yes': 2
                },
                'nationality': {
                    'UAE': 0, 'India': 1, 'Lebanon': 2, 'Sudan': 3, 
                    'United States': 4, 'Comoros': 5, 'Oman': 6, 'Iran': 7, 
                    'Philippenes': 8, 'United Kingdom': 9, 'Philippines': 8,
                    'Pakistan': 10, 'Bangladesh': 11, 'Egypt': 12, 'Jordan': 13,
                    'Syria': 14, 'Morocco': 15, 'Yemen': 16, 'Somalia': 17
                }
            }
            
            # Apply categorical mappings
            for col, mapping in categorical_mappings.items():
                if col in gdm_df.columns:
                    gdm_df[col] = gdm_df[col].map(mapping).fillna(0)
            
            # Ensure all required columns are present in correct order
            for col in self.feature_columns:
                if col not in gdm_df.columns:
                    gdm_df[col] = 0

            # Select and order columns as expected by model
            gdm_df = gdm_df[self.feature_columns]
            
            # apply scaling using the pre-trained scaler 
            if self.scaler is not None:
                try:
                    # check if scaler was trained on all features or just numerical ones
                    if hasattr(self.scaler, 'feature_names_in_') and len(self.scaler.feature_names_in_) == len(self.feature_columns):
                        # Scaler was trained on all features the same
                        gdm_df_scaled = pd.DataFrame(
                            self.scaler.transform(gdm_df),
                            columns=gdm_df.columns
                        )
                        gdm_df = gdm_df_scaled
                        logger.info("Applied scaling to all features")
                    else:
                        # Scaler was trained on numerical features only
                        gdm_df_copy = gdm_df.copy()
                        gdm_df_copy[numerical_columns] = self.scaler.transform(gdm_df_copy[numerical_columns])
                        gdm_df = gdm_df_copy
                        logger.info("Applied scaling to numerical features only")
                except Exception as e:
                    logger.warning(f"Could not apply pre-trained scaler: {str(e)}. Skipping scaling.")
            else:
                logger.info("No pre-trained scaler available, skipping scaling")

            return gdm_df

        except Exception as e:
            logger.error(f"Error preprocessing data: {str(e)}")
            raise ValueError(f"Data preprocessing failed: {str(e)}")
    
    def sendFI(self):
        """Function to send feature importance results"""
        
        importance_gdm_df = pd.DataFrame({
                "Features": self.feature_columns,
                "Importance": self.model.feature_importances_ 
            }).sort_values(
                by="Importance",
                ascending=False # Sort descendingly by importance so we get the most important features as the top most
            )
        return importance_gdm_df
    
    def predict(self, patient_data): # Function to create GDM prediction
        """Make a GDM prediction for a single patient"""
        
        if self.model is None: # error check model loading
            raise ValueError("Model is not loaded, maybe model.pkl does not exist in your dir")

        try:
            # Preprocess the input data
            processed_data = self.preprocess_input(patient_data)

            # Make prediction
            prediction = self.model.predict(processed_data)[0]
            prediction_proba = self.model.predict_proba(processed_data)[0]

            # Get confidence score
            confidence = float( # Make sure confidence score is a float, and convert to fixed probability
                max(prediction_proba) * 100
            )
            
            gdm_probability = float( # Serialize into GDM or no GDM
                prediction_proba[1] * 100
            ) if len(prediction_proba) > 1 else 0
            
            
            # Get the top 5 most influential features to the model's prediction
            importance = self.sendFI()
            FS = importance["Features"].to_list()[:5] # Limiting to top 5 factors
            
            print("feature importance top 5: ", FS)
            print("prediction: ", prediction)
            print("prediction probability: ", prediction_proba)
            print("confidence score: ", confidence)
            print("gdm_probability", gdm_probability)
            
            result = { # result request to be sent back to frontend
                'prediction': 'GDM Risk' if prediction == 1 else 'No GDM Risk',
                'confidence': round(confidence, 2),
                'gdm_probability': round(gdm_probability, 2),
                'factors': FS,  
                'model_version': '1.0',
            }

            return result # return back result json object

        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise ValueError(f"Prediction failed: {str(e)}")



# Initialize the predictor
predictor = GDMPredictor()

# the predict function
@app.route('/predict', methods=['POST'])
def predict_gdm():
    """Predict GDM risk for a patient"""
    try:
        # Get patient data from request
        data = request.json

        if not data: # check if data does not exist (null)
            # jsonify a not found error
            return jsonify({'error': 'no prediction data provided'}), 400

        # split patient data
        patient_data = data.get('patientData', {})

        if not patient_data:
            # jsonify a not found error if patient data does not exist
            return jsonify({'error': 'no patient data provided'}), 400

        # generate prediction using the loaded model
        start_time = datetime.now() # start time
        result = predictor.predict(patient_data) # make prediction
        end_time = datetime.now() # end time upon finishing the prediction

        # response time calculation (for testing purposes)
        response_time = int( # receive time - send start time
            (end_time - start_time).total_seconds() * 1000
        )
        
        # save in results
        result['apiResponseTime'] = response_time

        # log prediction info
        logger.info(f"Prediction made: {result['prediction']} with {result['confidence']}% confidence")

        return jsonify(result)

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Internal server error occurred'}), 500

# health check endpoints
@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'GDM Predict AI API is running',
        'version': '1.0',
        'model_loaded': predictor.model is not None
    })

@app.route('/model/status', methods=['GET'])
def model_status():
    """Get model status and information"""
    return jsonify({
        'model_loaded': predictor.model is not None,
        'model_path': predictor.model_path,
        'feature_columns': predictor.feature_columns,
        'model_type': 'GDM Risk Classifier'
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy',
        # time in ISO formatting
        'timestamp': datetime.now().isoformat(),
        'model_status': 'loaded' if predictor.model is not None else 'not_loaded',
        'version': '1.0'
    })

if __name__ == '__main__':
    if predictor.model is None: # error check model loading
        logger.error("loading model failed, please ensure model.pkl exists in the current dir.")
    else:
        logger.info("GDM Predict AI API is ready")

    # Run the Flask app
    app.run(host='0.0.0.0', port=5000)
#* Port 5000 for API, debugging mode is not enabled