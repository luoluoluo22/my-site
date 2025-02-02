import requests
import json

def test_knowledge_api():
    API_URL = 'https://luoluo.netlify.app/.netlify/functions/knowledge-api/retrieval'
    API_KEY = '1234567890'

    print('开始测试知识库API...')
    print('API地址:', API_URL)
    print('使用的API密钥:', API_KEY)

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'knowledge_id': 'notes',
        'query': '测试查询',
        'retrieval_setting': {
            'top_k': 3,
            'score_threshold': 0.1
        }
    }

    print('\n请求头:', headers)
    print('请求数据:', json.dumps(data, ensure_ascii=False, indent=2))

    try:
        # 发送请求
        response = requests.post(API_URL, headers=headers, json=data)

        # 打印响应信息
        print('\n响应状态码:', response.status_code)
        print('响应头:', dict(response.headers))
        
        try:
            json_data = response.json()
            print('\n响应数据:', json.dumps(json_data, ensure_ascii=False, indent=2))
            
            if 'records' in json_data:
                print('\n检索到的记录数:', len(json_data['records']))
                for i, record in enumerate(json_data['records'], 1):
                    print(f'\n记录 {i}:')
                    print(f"标题: {record.get('title', '无标题')}")
                    print(f"相关度: {record.get('score', 0):.2f}")
                    print(f"来源: {record.get('metadata', {}).get('source', '未知')}")
            elif 'error_code' in json_data:
                print('\n错误代码:', json_data['error_code'])
                print('错误信息:', json_data['error_msg'])
            
        except json.JSONDecodeError:
            print('\n原始响应内容:', response.text)

    except requests.exceptions.RequestException as e:
        print('请求失败:', str(e))

if __name__ == '__main__':
    test_knowledge_api() 