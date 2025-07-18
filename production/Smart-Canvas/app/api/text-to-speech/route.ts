import { NextRequest, NextResponse } from 'next/server';

interface TextToSpeechRequest {
  text: string;
  provider: 'elevenlabs' | 'openai' | 'google';
  voice: string;
  apiKey: string;
  speed?: number;
  pitch?: number;
  stability?: number;
  similarityBoost?: number;
  model?: string;
}

async function generateWithElevenLabs(request: TextToSpeechRequest) {
  const { text, voice, apiKey, stability = 0.5, similarityBoost = 0.5 } = request;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: 0.0,
        use_speaker_boost: true
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
  
  return audioUrl;
}

async function generateWithOpenAI(request: TextToSpeechRequest) {
  const { text, voice, apiKey, speed = 1.0, model = 'tts-1' } = request;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      input: text,
      voice: voice,
      speed: speed,
      response_format: 'mp3'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
  
  return audioUrl;
}



async function generateWithGoogle(request: TextToSpeechRequest) {
  const { text, voice, apiKey, speed = 1.0, pitch = 0 } = request;

  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text: text },
      voice: {
        languageCode: voice.split('-').slice(0, 2).join('-'),
        name: voice,
        ssmlGender: voice.includes('Female') || voice.includes('A') || voice.includes('D') ? 'FEMALE' : 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
        pitch: pitch
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  const audioUrl = `data:audio/mpeg;base64,${result.audioContent}`;
  
  return audioUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body: TextToSpeechRequest = await request.json();
    
    const { text, provider, voice, apiKey } = body;
    
    // Validation
    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }
    
    if (!voice) {
      return NextResponse.json(
        { success: false, error: 'Voice is required' },
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Check text length limits
    const maxLength = provider === 'elevenlabs' ? 2500 : 4000;
    if (text.length > maxLength) {
      return NextResponse.json(
        { success: false, error: `Text too long. Maximum ${maxLength} characters for ${provider}` },
        { status: 400 }
      );
    }

    let audioUrl: string;

    // Generate speech based on provider
    switch (provider) {
      case 'elevenlabs':
        audioUrl = await generateWithElevenLabs(body);
        break;
      case 'openai':
        audioUrl = await generateWithOpenAI(body);
        break;
      case 'google':
        audioUrl = await generateWithGoogle(body);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      audioUrl: audioUrl,
      provider: provider,
      voice: voice,
      text: text
    });

  } catch (error: any) {
    console.error('Text-to-speech error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate speech' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to generate speech.' 
    },
    { status: 405 }
  );
}
