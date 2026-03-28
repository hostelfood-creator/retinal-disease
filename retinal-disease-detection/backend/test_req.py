import requests

try:
    with open('c:/Users/msara/OneDrive/Desktop/PG project/retinal-disease-detection/frontend/public/logo192.png', 'rb') as f:
        res = requests.post('http://localhost:8000/api/v1/report/generate', files={'file': f})
    print(res.status_code, res.text)
except Exception as e:
    print(e)
