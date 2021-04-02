'''
Using resemble API based on https://app.resemble.ai/docs to do TTS (text-to-speech)
'''
import requests
import os
import copy

## Define variables
# User API token for access
pt_token = "RMzTNK7fdrYyAFKJ7Nrjagtt"
# Project to consider
project_uuid = 'e89aa5c3'
# User ID (uuid) for voice
pt_voice = '89423c90'
# text to convert to speech
text_title = 'Demo_api_2'
inputs = ['Trying out the API for resemble by using my voice. Hopefully,'
             ' it works and we can make our pipeline come true.',
          'One of my favourite parts of this projects is that though '
          'deep fakes are considered harmful, this shows one concrete utility of them!']
text_input = inputs[1]
# Path to save asynchronously generated clip
save_path = 'results'
# To try out pre-set emotions
valid_emotions = ['neutral', 'angry', 'annoyed', 'question', 'happy']
text_title_emotions = []
generated_clip_id_emotions = []
generated_clip_link_emotions = []
for emotion in valid_emotions:
    text_title_emotions.append(emotion)

## Flags:
# If want to loop over emotions as a trial
emotion_flag = False
# Send text to generate clip
generate_voice = True
# if generate voice is false provide clip id
generated_clip_id = 'ba84b85e' #'ca7c3bea' # For automatic emotion voice
# generated_clip_id_emotions = ['0404e55b', '411decfe', '2ef24422', '5ddf5eea', '19456241'] # With emotions in order:
# Fetch generated clip details
fetch_voice = False
#if fetch voice is false provide clip link to save it
# generated_clip_link = 'https://app.resemble.ai/rails/active_storage/blobs/' \
#                       'eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBK0llVVE9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ' \
#                       '==--a118f7b167de69262d386ba2b5e6b798e61e6007/ca7c3bea.wav'
# Save voice on server
save_voice = False

## Get all Project Data for the user
url = "https://app.resemble.ai/api/v1/projects"
headers = {
  'Authorization': 'Token token=' + pt_token,
  'Content-Type': 'application/json'
}
response = requests.get(url, headers=headers)
# print(response.content)
projects_available = response.json()
print('All Project Data')
print(projects_available)

## Get data for a specific project
url = "https://app.resemble.ai/api/v1/projects/" + project_uuid
headers = {
  'Authorization': 'Token token=' + pt_token,
  'Content-Type': 'application/json'
}
response = requests.get(url, headers=headers)
print('Specific Project Data')
print(response.json())

# Get all available voices
url = "https://app.resemble.ai/api/v1/voices"
headers = {
  'Authorization': 'Token token=' + pt_token,
  'Content-Type': 'application/json'
}
response = requests.get(url, headers=headers)
print('All voices')
print(response.json())

def generate_voice_fn(project_uuid, user_token, text_title, text_input, user_voice, emotion = None):
    ## Using API asynchronously to generate some text
    url = "https://app.resemble.ai/api/v1/projects/" + project_uuid + "/clips"
    headers = {
        'Authorization': 'Token token=' + user_token,
        'Content-Type': 'application/json'
    }
    if emotion is not None:
        text_input_em = f'<speak><resemble:style emotions = "{emotion}">{text_input}</resemble:style></speak>'
    else:
        text_input_em = copy.copy(text_input)

    print(text_input_em)

    data = {
        'data': {
            'title': text_title,
            'body': text_input_em,
            'voice': user_voice,
        },
        # "callback_uri": "https://mycall.back/service" # default
        # "callback_uri": "https://webhook.site/c08d0ced-0450-43a9-8f62-00482545bfcc" #webhook site
        "callback_uri": "https://7fd2364008af.ngrok.io" #server ngrok
        # "callback_uri": "https://63ea99b482e1.ngrok.io"  # local ngrok
    }
    print(data["callback_uri"])
    response = requests.post(url, headers=headers, json=data)
    print('Generating clip using API')
    print(response.json())
    return response.json()['id']

def fetch_voice_fn(project_uuid, generated_clip_id, user_token):
    ## Fetching generated async clip using API
    url = "https://app.resemble.ai/api/v1/projects/" + project_uuid + "/clips/" + generated_clip_id
    headers = {
        'Authorization': 'Token token=' + user_token,
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    print('Fetching Clip using API')
    print(response.json())
    return response.json()['link']

def save_voice_fn(text_title, save_path, generated_clip_link):
    ## Save Content
    save_title = text_title + '.wav'
    save_filename = os.path.join(save_path, save_title)
    audio = requests.get(generated_clip_link)
    print('Saving file')
    open(save_filename, 'wb').write(audio.content)
    print('File saved')

if emotion_flag:
    for i, emotion in enumerate(valid_emotions):
        if generate_voice:
            generated_clip_id = \
                generate_voice_fn(project_uuid, pt_token, text_title_emotions[i], text_input, pt_voice, emotion)
            generated_clip_id_emotions.append(generated_clip_id)
        if fetch_voice:
            generated_clip_link = \
                fetch_voice_fn(project_uuid, generated_clip_id_emotions[i], pt_token)
            generated_clip_link_emotions.append(generated_clip_link)
        if save_voice:
            save_voice_fn(text_title_emotions[i], save_path, generated_clip_link_emotions[i])
else:
    if generate_voice:
        generated_clip_id = \
            generate_voice_fn(project_uuid, pt_token, text_title, text_input, pt_voice)

    if fetch_voice:
        generated_clip_link = \
            fetch_voice_fn(project_uuid, generated_clip_id, pt_token)

    # save content
    if save_voice:
        save_voice_fn(text_title, save_path, generated_clip_link)


# ## Using API synchronously to generate some text
# url = "https://app.resemble.ai/api/v1/projects/" + project_uuid + "/clips/sync"
# headers = {
#   'Authorization': 'Token token=' + pt_token,
#   'Content-Type': 'application/json'
# }
# data = {
#   'data': {
#     'title': text_title,
#     'body': text_input,
#     'voice': pt_voice,
#   }
# }
#
# response = requests.post(url, headers=headers, json=data)
# print('Generating clip using API')
# print(response.json())