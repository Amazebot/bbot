## Amazon

https://console.aws.amazon.com/comprehend/v2/home?region=us-east-1#welcome

> Use Amazon Comprehend to determine the sentiment of a document. You can determine if the sentiment is positive, negative, neutral, or mixed.
>
> The operations return the most likely sentiment for the text as well as the scores for each of the sentiments. The score represents the likelihood that the sentiment was correctly detected.

### Summary

Result range is basic, but giving each with score, along with a primary sentiment assertion is helpful.

Could not make sense of the AWS dashboard, or find any docs for API endpoints. Some example usage for libraries, but none for Node.

### API

- Auth: ??
- Endpoint: ??
- Results: `positive`, `negative`, `neutral`, `mixed`

Example:
```json
{
    "SentimentScore": {
        "Mixed": 0.014585512690246105,
        "Positive": 0.31592071056365967,
        "Neutral": 0.5985543131828308,
        "Negative": 0.07093945890665054
    },
    "Sentiment": "NEUTRAL",
    "LanguageCode": "en"
}
```

## Google

> Score of the sentiment ranges between -1.0 (negative) and 1.0 (positive) and corresponds to the overall emotional leaning of the text.

> Magnitude indicates the overall strength of emotion (both positive and negative) within the given text, between 0.0 and +inf. Unlike score, magnitude is not normalized; each expression of emotion within the text (both positive and negative) contributes to the text's magnitude (so longer text blocks may have greater magnitudes).

https://cloud.google.com/natural-language/docs/basics

### Summary

Sentiment range is just a floating value on a spectrum of negative to positive, so not much versatility for using in conversation triggers, more for analysing general sentiment trends in lots of messages.

Magnitude score could be useful. As in the API example, the statement is marginally positive, but has a negative magnitude, which could be accurately finding it's a tentative statement. In a lot of cases it just makes the result confusing.

Giving an individual result for each sentence is nice.

### API

- Auth: Key in URL param, as below.
- Endpoint: `https://language.googleapis.com/v1/documents:analyzeSentiment?key=<YOUR_KEY>`
- Range: `0.0` - `1.0`

Request:
```json
{
	"document": {
		"type": "PLAIN_TEXT",
		"content": "Hmm, this could be good, but I don't see it working within the time frame."
	}
}
```

Result:
```json
{
    "documentSentiment": {
        "magnitude": 0.6,
        "score": -0.6
    },
    "language": "en",
    "sentences": [
        {
            "text": {
                "content": "Hmm, this could be good, but I don't see it working within the time frame.",
                "beginOffset": -1
            },
            "sentiment": {
                "magnitude": 0.6,
                "score": -0.6
            }
        }
    ]
}
```

### Code

https://github.com/googleapis/nodejs-language

```typescript
import * as language from '@google-cloud/language'
const client = new language.LanguageServiceClient()

async function analyse (text: string) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  }
  const results = client.analyzeSentiment({document: document})
  const sentiment = results[0].documentSentiment
  console.log(sentiment.score, sentiment.magnitude)

  const sentences = results[0].sentences
  sentences.forEach(sentence => {
    console.log(`Sentence: ${sentence.text.content}`)
    console.log(sentiment.score, sentiment.magnitude)
  })
}

```

## Recast.ai (SAP)

https://recast.ai/docs/api-reference/#request-text

> We decided to follow guidelines suggesting a higher granularity of sentiments that you may be used to. This allows you to treat different levels of positive, and negative inputs.

> We currently detect 4 acts of a sentence, as defined in the section 8.7 of Natural Language Understanding, 1995, James Allen. Those 4 categories are defined as surface speech acts, which indicate how the proposition described is intended to be used to update the discourse situation.

### Summary

UX and on-boarding is good. Node SDK has good structure and features.

Range of sentiment detection is better than some, but has no score and only returns a single identifier. Sentiment results also seem pretty off the mark.

Text analysis includes acts (`assert`, `command`, `wh-query`, `yn-query`) which is quite unique, as it allows a sort of meta level of intent detection without any training. Could be used to change the attitude of a reply.

If intent is a request, but act is `assert`, cut to the chase. If it's a `yn-query` maybe they're unsure what they're even asking for, so the response could validate the intent.
As below, two statements where the intent is to request some apples, with responses based on the _act_.

- q: Give me apples
- a: Sure, how many (max 10)?
- q: 5
- a: 🍎🍎🍎🍎🍎

- q: Do you have any apples?
- a: Yes we have 10 apples, would you like some?
- q: Yeah I'll take 5.
- a: Here you go... 🍎🍎🍎🍎🍎

### API

- Auth: Headers `"Authorization": "Token <YOUR_TOKEN>"`
- Endpoint: `https://api.recast.ai/v2/request`
- Range: `vpositive`, `positive`, `negative`, `neutral`, `vnegative`

Request:
```json
{
	"text": "Hmm, this could be good, but I don't see it working within the time frame.",
	"language": "en"
}
```

Result:
```json
{
  "results": {
    "uuid": "...",
    "source": "Hmm, this could be good, but I don't see it working within the time frame.",
    "intents": [],
    "act": "assert",
    "type": null,
    "sentiment": "vnegative",
    "language": "en",
    "processing_language": "en",
    "version": "2.12.0",
    "timestamp": "2018-07-08T09:03:37.625613+00:00",
    "status": 200
  },
  "message": "Requests rendered with success"
}
```

### Code

https://github.com/RecastAI/SDK-NodeJS

```typescript
import recast from 'recastai'
const client = new recast('YOUR_TOKEN')

async function analyse (text: string) {
  const result = await client.request.analyseText(text)
  console.log(result.sentiment)
}
```

### Microsoft

https://westus.dev.cognitive.microsoft.com/docs/services/TextAnalytics.V2.0/operations/56f30ceeeda5650db055a3c9

> The API returns a numeric score between 0 and 1. Scores close to 1 indicate positive sentiment, while scores close to 0 indicate negative sentiment. A score of 0.5 indicates the lack of sentiment (e.g. a factoid statement). See the Supported languages in Text Analytics API for the list of enabled languages.

### Summary

Examples given for Node.js, but no SDKs are available but not officially supported. Azure provides lots of credit and tools for prototyping.

Range is again just a negative-positive spectrum, so the utility is similar to Google, i.e. more for trend analysis. The granularity is greater, but the results seem less accurate.

Text analysis seems more versatile for multi-lingual usage and also returns _key phrases_ found in text. I can see that being useful to texture even catch-all responses with some recognised details.

### API

- Auth: Headers `"Ocp-Apim-Subscription-Key": "<YOUR_KEY>"`
- Endpoint: `https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment`
- Range: `0.00000000000000000` to `1.00000000000000000`

Request:
```json
{
	"documents": [
		{
			"id": "1",
			"text": "Hmm, this could be good, but I don't see it working within the time frame."
		}
	]
}
```

Result:
```json
{
    "documents": [
        {
            "score": 0.17877522110939026,
            "id": "1"
        }
    ],
    "errors": []
}
```

### Code

```typescript
import https from require 'https'
const params = {
  method: 'POST',
  headers: { 'Ocp-Apim-Subscription-Key': '<YOUR_KEY>' },
  hostname: 'westus.api.cognitive.microsoft.com',
  path: '/text/analytics/v2.0/sentiment'
}

async function analyse (text: string) {
  const request = https.request(params, (response) => {
    let body = ''
    response.on ('data', (d) => body += d)
    response.on ('end', () => console.log(JSON.parse(body).documents[0].score))
  })
  request.write(JSON.stringify({ id: '1', language: 'en', text }))
  request.end()
}
```

## Watson (IBM)


> The emotion tones are categorised as anger, disgust, fear, joy, and sadness.
> The language tones are categorised as analytical, confident, and tentative.
> The social tones (Big Five personality traits) are categorised as openness, conscientiousness, extraversion, agreeableness, and emotional range.

### Summary

Providing both tone and sentiment allows great versatility in conversational usage.

### API

### Code

https://github.com/watson-developer-cloud/node-sdk

```typescript

tone.tone({
    tone_input: 'Greetings from Watson Developer Cloud!',
    content_type: 'text/plain'
  },
  function(err, tone) {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(tone, null, 2));
    }
  }
);
import WatsonTone from 'watson-developer-cloud/tone-analyzer/v3'
import WatsonNLU from 'watson-developer-cloud/natural-language-understanding/v1'
var tone = new WatsonTone({
  token: '<YOUR_TOKEN>',
  version: '2016-05-19',
  url: 'https://gateway.watsonplatform.net/tone-analyzer/api/'
});
const nlu = new WatsonNLU({
  token: '<YOUR_TOKEN>',
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});

async function analyse (text: string) {
  const result = []
  result.push(new Promise((resolve, reject) => {
    tone.tone({ tone_input: text, sentences: false }, (err, response) => {
      if (err) throw err
      resolve(JSON.stringify(response, null, 2))
    }
  }))
  result.push(new Promise((resolve, reject) => {
    nlu.analyze({ text }, (err, response) => {
      if (err) throw err
      resolve(JSON.stringify(response, null))
  }))
  return Promise.all(result).then((results) => {
    return {
      tone: results[0].
    }
  })
)