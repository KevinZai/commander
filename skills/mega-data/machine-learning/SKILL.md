---
name: machine-learning
description: "ML model development — data preparation, model selection, training, evaluation, and deployment with scikit-learn, PyTorch, and TensorFlow."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, ml, machine-learning, ai]
disable-model-invocation: true
---

# Machine Learning

## What This Does

Guides ML model development from problem definition through deployment — covering data preparation, feature engineering, model selection, training, evaluation, and serving. Supports scikit-learn for classical ML, PyTorch for deep learning, and production deployment patterns.

## Instructions

1. **Define the ML problem.** Before writing code:
   - What are you predicting? (classification, regression, ranking, clustering)
   - What data is available? (features, labels, volume)
   - What metric defines success? (accuracy, F1, RMSE, AUC-ROC)
   - What's the baseline? (random guess, simple heuristic, current system)
   - What are the constraints? (latency, model size, interpretability)

2. **Choose the approach.**

   | Problem | Data Size | Start With | Graduate To |
   |---------|-----------|-----------|-------------|
   | Classification (tabular) | < 100K rows | Logistic Regression, Random Forest | XGBoost, LightGBM |
   | Classification (tabular) | > 100K rows | XGBoost, LightGBM | Neural network if needed |
   | Regression (tabular) | Any | Linear Regression, Random Forest | XGBoost, LightGBM |
   | Text classification | Any | TF-IDF + LogReg | Fine-tuned transformer |
   | Image classification | < 10K images | Pre-trained model + fine-tune | Custom CNN |
   | Time series | Any | ARIMA, Prophet | LSTM, Temporal Fusion Transformer |
   | Recommendation | Any | Collaborative filtering | Matrix factorization, two-tower |
   | Clustering | Any | K-Means, DBSCAN | HDBSCAN, Gaussian Mixture |

3. **Prepare the data.**
   ```python
   import pandas as pd
   from sklearn.model_selection import train_test_split
   from sklearn.preprocessing import StandardScaler, LabelEncoder

   # Load and explore
   df = pd.read_csv('data.csv')
   print(df.shape, df.dtypes)
   print(df.describe())
   print(df.isnull().sum())

   # Handle missing values
   df['age'] = df['age'].fillna(df['age'].median())
   df = df.dropna(subset=['target'])  # Never impute the target

   # Encode categoricals
   label_encoders = {}
   for col in categorical_columns:
       le = LabelEncoder()
       df[col] = le.fit_transform(df[col].astype(str))
       label_encoders[col] = le

   # Split BEFORE any fitting (prevent data leakage)
   X = df.drop('target', axis=1)
   y = df['target']
   X_train, X_test, y_train, y_test = train_test_split(
       X, y, test_size=0.2, random_state=42, stratify=y
   )

   # Scale AFTER split (fit only on training data)
   scaler = StandardScaler()
   X_train_scaled = scaler.fit_transform(X_train)
   X_test_scaled = scaler.transform(X_test)  # transform only, no fit
   ```

4. **Train and evaluate (scikit-learn).**
   ```python
   from sklearn.ensemble import RandomForestClassifier
   from sklearn.metrics import classification_report, confusion_matrix
   from sklearn.model_selection import cross_val_score

   # Cross-validation first
   model = RandomForestClassifier(n_estimators=100, random_state=42)
   cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='f1')
   print(f"CV F1: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

   # Train on full training set
   model.fit(X_train_scaled, y_train)

   # Evaluate on test set (only once, at the end)
   y_pred = model.predict(X_test_scaled)
   print(classification_report(y_test, y_pred))
   print(confusion_matrix(y_test, y_pred))

   # Feature importance
   importances = pd.Series(
       model.feature_importances_, index=X.columns
   ).sort_values(ascending=False)
   print(importances.head(10))
   ```

5. **Train with PyTorch (deep learning).**
   ```python
   import torch
   import torch.nn as nn
   from torch.utils.data import DataLoader, TensorDataset

   class SimpleNet(nn.Module):
       def __init__(self, input_dim, hidden_dim, output_dim):
           super().__init__()
           self.net = nn.Sequential(
               nn.Linear(input_dim, hidden_dim),
               nn.ReLU(),
               nn.Dropout(0.3),
               nn.Linear(hidden_dim, hidden_dim // 2),
               nn.ReLU(),
               nn.Dropout(0.3),
               nn.Linear(hidden_dim // 2, output_dim),
           )

       def forward(self, x):
           return self.net(x)

   # Training loop
   model = SimpleNet(input_dim=X_train.shape[1], hidden_dim=128, output_dim=2)
   optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
   criterion = nn.CrossEntropyLoss()

   for epoch in range(100):
       model.train()
       for batch_X, batch_y in train_loader:
           optimizer.zero_grad()
           output = model(batch_X)
           loss = criterion(output, batch_y)
           loss.backward()
           optimizer.step()
   ```

6. **Deploy the model.**
   - **Simple:** Export with `joblib.dump()` / `torch.save()`, serve via FastAPI
   - **Scalable:** ONNX export for cross-platform serving
   - **Production:** MLflow for experiment tracking + model registry
   - **Edge:** Convert to ONNX or TensorFlow Lite for mobile/embedded

## Output Format

```markdown
# ML Model: {Model Name}

## Problem
- Type: {classification/regression/clustering}
- Target: {what we're predicting}
- Metric: {primary evaluation metric}

## Data
- Samples: {train/val/test counts}
- Features: {count and key features}
- Target distribution: {balanced/imbalanced, class ratios}

## Model
- Algorithm: {name}
- Hyperparameters: {key params}
- Training time: {duration}

## Results
| Metric | Train | Validation | Test |
|--------|-------|-----------|------|
| {metric} | {score} | {score} | {score} |

## Feature Importance
| Feature | Importance |
|---------|-----------|
| {feature} | {score} |

## Deployment
{How to serve the model in production}
```

## Tips

- Always establish a baseline (random, majority class, simple heuristic) before building complex models
- Data leakage is the #1 beginner mistake — never fit preprocessors on test data, never use future data
- Start simple (logistic regression, random forest) — complex models are only better if you have enough data
- XGBoost/LightGBM win most tabular data competitions — try them before deep learning on structured data
- Cross-validation is more reliable than a single train/test split for small datasets
- Track experiments systematically (MLflow, Weights & Biases) — you will forget what you tried
- A model is only useful if it's deployed — plan for serving from day one
