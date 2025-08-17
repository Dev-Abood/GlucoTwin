import pandas as pd
import os

def process_gdm_data(file_path='GDM_UOS.xlsx', output_file='GDM_UOS_NoC.csv'):
    """
    Completes the basic pre-processing by combining NGDM and GDM sheets, removing unwanted mode of delivery and socioeconomic columns,
    and adding a target column at the end.
    
    Args:
        file_path (str): Path to the Excel file
        output_file (str): Path for the output CSV file
    """
    
    # checking if the given file_path exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        return False
    
    print(f"File '{file_path}' found successfully.")
    
    try:
        # Read both sheets from the Excel file (NGDM, GDM)
        
        # GDM patients data
        gdm_data = pd.read_excel(
            file_path, 
            sheet_name='GDM'
        )
        
        # Non-GDM patients data
        ngdm_data = pd.read_excel(
            file_path, 
            sheet_name='NGDM'
        )
        
        # view the basic shape information
        print(f"GDM sheet: {gdm_data.shape[0]} rows, {gdm_data.shape[1]} columns")
        print(f"NGDM sheet: {ngdm_data.shape[0]} rows, {ngdm_data.shape[1]} columns")
        
        # cleaning column names (remove any extra spaces and handle unnamed columns)
        gdm_data.columns = gdm_data.columns.astype(str).str.strip()
        ngdm_data.columns = ngdm_data.columns.astype(str).str.strip()
        
        # Remove unnamed columns (these appear as 'Unnamed: X' when pandas reads empty columns)
        gdm_data = gdm_data.loc[:, ~gdm_data.columns.str.contains('^Unnamed')]
        ngdm_data = ngdm_data.loc[:, ~ngdm_data.columns.str.contains('^Unnamed')]
        
        # display column names for verification
        gdm_columns = list(gdm_data.columns)
        ngdm_columns = list(ngdm_data.columns)
        
        print("\nGDM columns before:", gdm_columns)
        print("\nNGDM columns before:", ngdm_columns)
        
        # Columns to remove (cleaned names without trailing spaces)
        columns_to_remove = [
            'socioeconomic status', 
            'Mode of Delivery',
            'HbA1c Levels at Delivery:',
            'HbA1c Levels at Diagnosis (if using insulin):',
            'Gestational Age at Diagnosis of GDM (Months)',
            'Patients'
        ]
        
        # Remove the specified columns if they exist (with flexible matching)
        for col in columns_to_remove:
            # Check in GDM data
            matching_cols_gdm = [c for c in gdm_data.columns if c.strip() == col.strip()]
            for match in matching_cols_gdm:
                gdm_data = gdm_data.drop(columns=[match])
                print(f"Removed '{match}' from GDM data")
            
            # Check in NGDM data  
            matching_cols_ngdm = [c for c in ngdm_data.columns if c.strip() == col.strip()]
            for match in matching_cols_ngdm:
                ngdm_data = ngdm_data.drop(columns=[match])
                print(f"Removed '{match}' from NGDM data")
        
        # Add Type of treatment to NGDM data
        # GDM patients have actual treatments, NGDM patients should be marked as "No Treatment"
        if 'Type of treatment' not in ngdm_data.columns:
            ngdm_data['Type of treatment'] = 'No Treatment'
        
        print(f"\nColumns after special handling:")
        print(f"GDM columns: {list(gdm_data.columns)}")
        print(f"NGDM columns: {list(ngdm_data.columns)}")
        
        # find common columns to ensure consistent structure to avoid keyErrors
        common_columns = list(
            set(gdm_data.columns) & set(ngdm_data.columns)
        )
        
        print(f"\nCommon columns: {len(common_columns)} \n")
        print(f"Common columns list: {common_columns}")
        
        #* keep only common columns for both datasets
        gdm_common = gdm_data[common_columns].copy()
        ngdm_common = ngdm_data[common_columns].copy()
        
        #! Adding target column (GDM status, 1 for GDM patients, 0 for Non-GDM patients)
        gdm_common['GDM'] = 1 
        ngdm_common['GDM'] = 0  
        
        print(f"\nAfter preprocessing:")
        
        # new shapes
        print(f"GDM data: {gdm_common.shape[0]} rows, {gdm_common.shape[1]} columns")
        print(f"NGDM data: {ngdm_common.shape[0]} rows, {ngdm_common.shape[1]} columns")
        
        # Combine both datasets
        combined_data = pd.concat(
            [ngdm_common, gdm_common], # concatinate both ngdm and gdm patients data in one excel sheet
            ignore_index=True
        )
        
        # Save as CSV format for better future usage
        combined_data.to_csv(output_file, index=False)
        print(f"\nData successfully saved to '{output_file}'")
        
        # Display basic info about the final dataset
        COMBINED = combined_data
        print(f"\nCombined dataset: {COMBINED.shape[0]} rows, {COMBINED.shape[1]} columns")
        print(f"Target distribution: {COMBINED['GDM'].value_counts().to_dict()}")
        print("\nFinal dataset info:")
        print(f"Columns: {list(COMBINED.columns)}")
        print(f"Data types:\n{COMBINED.dtypes}")
        print(f"\nFirst few rows:")
        print(COMBINED.head())
        
        return True
        
    except Exception as e: # catching errors statement
        print(f"Error processing data: {str(e)}")
        return False

# run function
if __name__ == "__main__":
    success = process_gdm_data()
    
    if success:
        print("\nProcessing completed")
    else:
        print("\nProcessing failed")