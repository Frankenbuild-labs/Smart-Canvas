import { NextRequest, NextResponse } from 'next/server';

interface VoiceCloningRequest {
  provider: 'elevenlabs';
  apiKey: string;
  action: 'clone' | 'generate';
  voiceName?: string;
  voiceDescription?: string;
  audioUrl?: string;
  voiceId?: string;
  text?: string;
}

async function cloneVoiceElevenLabs(request: VoiceCloningRequest) {
  const { voiceName, voiceDescription, audioUrl, apiKey } = request;

  // Convert data URL to blob if needed
  let audioBlob: Blob;
  if (audioUrl!.startsWith('data:')) {
    const response = await fetch(audioUrl!);
    audioBlob = await response.blob();
  } else {
    const response = await fetch(audioUrl!);
    audioBlob = await response.blob();
  }

  const formData = new FormData();
  formData.append('name', voiceName!);
  if (voiceDescription) {
    formData.append('description', voiceDescription);
  }
  formData.append('files', audioBlob, 'voice_sample.mp3');

  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.voice_id;
}

async function generateSpeechElevenLabs(request: VoiceCloningRequest) {
  const { voiceId, text, apiKey } = request;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
        stability: 0.5,
        similarity_boost: 0.5,
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

export async function POST(request: NextRequest) {
  try {
    const body: VoiceCloningRequest = await request.json();
    
    const { provider, apiKey, action } = body;
    
    // Validation
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    if (action === 'clone') {
      // Voice cloning validation
      if (!body.voiceName?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Voice name is required for cloning' },
          { status: 400 }
        );
      }

      if (!body.audioUrl) {
        return NextResponse.json(
          { success: false, error: 'Audio sample is required for cloning' },
          { status: 400 }
        );
      }

      let voiceId: string;

      // Clone voice with ElevenLabs
      if (provider !== 'elevenlabs') {
        return NextResponse.json(
          { success: false, error: 'Only ElevenLabs provider is supported' },
          { status: 400 }
        );
      }

      voiceId = await cloneVoiceElevenLabs(body);

      return NextResponse.json({
        success: true,
        voiceId: voiceId,
        provider: provider,
        voiceName: body.voiceName
      });

    } else if (action === 'generate') {
      // Speech generation validation
      if (!body.text?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Text is required for generation' },
          { status: 400 }
        );
      }

      if (!body.voiceId) {
        return NextResponse.json(
          { success: false, error: 'Voice ID is required for generation' },
          { status: 400 }
        );
      }

      let audioUrl: string;

      // Generate speech with ElevenLabs
      if (provider !== 'elevenlabs') {
        return NextResponse.json(
          { success: false, error: 'Only ElevenLabs provider is supported' },
          { status: 400 }
        );
      }

      audioUrl = await generateSpeechElevenLabs(body);

      return NextResponse.json({
        success: true,
        audioUrl: audioUrl,
        provider: provider,
        voiceId: body.voiceId,
        text: body.text
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Voice cloning error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to process voice request' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST for voice operations.' 
    },
    { status: 405 }
  );
}
