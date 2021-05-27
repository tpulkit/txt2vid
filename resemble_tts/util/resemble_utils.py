import requests
import copy


def generate_voice_fn_resemble(project_uuid, user_token, text_title, text_input, user_voice,
                               callback_url, emotion=None):
    # Using API asynchronously to generate some text
    url = "https://app.resemble.ai/api/v1/projects/" + project_uuid + "/clips"
    headers = {
        'Authorization': 'Token token=' + user_token,
        'Content-Type': 'application/json'
    }
    if emotion is not None:
        text_input_em = f'<speak><resemble:style emotions = "{emotion}">{text_input}</resemble:style></speak>'
    else:
        text_input_em = copy.copy(text_input)

    # print(text_input_em)

    data = {
        'data': {
            'title': text_title,
            'body': text_input_em,
            'voice': user_voice,
        },
        "callback_uri": callback_url  # server ngrok
    }
    print(data["callback_uri"])
    response = requests.post(url, headers=headers, json=data)
    print('Generating clip using API')
    print(response.json())
    return response.json()['id']
