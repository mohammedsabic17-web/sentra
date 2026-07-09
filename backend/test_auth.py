import requests
url = 'http://127.0.0.1:8000/api/v1/auth/login/'
email = 'mohammedsabic17@gmail.com'
password = 'sentra@321'

def short(text, n=400):
    return text if len(text) <= n else text[:n] + '...'

try:
    r = requests.post(url, json={'email': email, 'password': password}, timeout=10)
    print('LOGIN', r.status_code)
    try:
        j = r.json()
        print('JSON keys:', list(j.keys()))
    except Exception:
        print('BODY:', short(r.text))

    if r.status_code == 200:
        data = r.json()
        access = data.get('access') or data.get('access_token') or data.get('token')
        print('GOT ACCESS:', bool(access))
        if access:
            with open('access_token.txt','w',encoding='utf-8') as f:
                f.write(access)
            print('Wrote access_token.txt')
        headers = {'Authorization': f'Bearer {access}'}

        me = requests.get('http://127.0.0.1:8000/api/v1/auth/me/', headers=headers, timeout=10)
        print('ME', me.status_code)
        try:
            print('ME keys:', list(me.json().keys()))
        except Exception:
            print('ME body:', short(me.text))

        roles = requests.get('http://127.0.0.1:8000/api/v1/roles/', headers=headers, timeout=10)
        print('ROLES', roles.status_code)
        try:
            print('ROLES count:', len(roles.json()))
        except Exception:
            print('ROLES body (html saved to roles_error.html)')
            with open('roles_error.html','w',encoding='utf-8') as f:
                f.write(roles.text)
            print('Wrote roles_error.html')

        audit = requests.get('http://127.0.0.1:8000/api/v1/audit-logs/', headers=headers, timeout=10)
        print('AUDIT', audit.status_code)
        try:
            j = audit.json()
            if isinstance(j, dict) and 'results' in j:
                print('AUDIT count:', j.get('count'), 'results:', len(j.get('results')))
            else:
                print('AUDIT items:', len(j))
        except Exception:
            print('AUDIT body:', short(audit.text))
    else:
        print('Login failed; check payload and server logs for details.')
except Exception as e:
    print('ERROR', e)
