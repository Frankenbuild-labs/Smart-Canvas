import { NextRequest, NextResponse } from 'next/server';

interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  provider: 'openai' | 'stability' | 'segmind';
  model: string;
  apiKey: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
}

async function generateWithOpenAI(request: ImageGenerationRequest) {
  const { prompt, model, apiKey, width = 1024, height = 1024 } = request;
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      n: 1,
      size: `${width}x${height}`,
      quality: 'standard',
      response_format: 'url'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data[0].url;
}

async function generateWithStability(request: ImageGenerationRequest) {
  const { 
    prompt, 
    negativePrompt, 
    model, 
    apiKey, 
    width = 1024, 
    height = 1024, 
    steps = 20, 
    guidance = 7.5,
    seed
  } = request;

  const formData = new FormData();
  formData.append('text_prompts[0][text]', prompt);
  formData.append('text_prompts[0][weight]', '1');
  
  if (negativePrompt) {
    formData.append('text_prompts[1][text]', negativePrompt);
    formData.append('text_prompts[1][weight]', '-1');
  }
  
  formData.append('cfg_scale', guidance.toString());
  formData.append('width', width.toString());
  formData.append('height', height.toString());
  formData.append('steps', steps.toString());
  formData.append('samples', '1');
  
  if (seed) {
    formData.append('seed', seed.toString());
  }

  const response = await fetch(`https://api.stability.ai/v1/generation/${model}/text-to-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  
  // Convert base64 to blob URL (simplified - in production, you'd want to save to storage)
  const base64Image = result.artifacts[0].base64;
  const imageUrl = `data:image/png;base64,${base64Image}`;
  
  return imageUrl;
}

async function generateWithSegmind(request: ImageGenerationRequest) {
  const { 
    prompt, 
    negativePrompt, 
    model, 
    apiKey, 
    width = 1024, 
    height = 1024, 
    steps = 20, 
    guidance = 7.5,
    seed
  } = request;

  const response = await fetch('https://api.segmind.com/v1/sd1.5-txt2img', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      negative_prompt: negativePrompt || '',
      style: request.style || 'base',
      samples: 1,
      scheduler: 'UniPC',
      num_inference_steps: steps,
      guidance_scale: guidance,
      strength: 0.8,
      seed: seed || Math.floor(Math.random() * 1000000),
      img_width: width,
      img_height: height,
      base64: true
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Segmind API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  
  // Convert base64 to data URL
  const imageUrl = `data:image/png;base64,${result.image}`;
  
  return imageUrl;
}



export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();
    
    const { prompt, provider, model, apiKey } = body;
    
    // Validation
    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }
    
    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model is required' },
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    let imageUrl: string;

    // Generate image based on provider
    switch (provider) {
      case 'openai':
        imageUrl = await generateWithOpenAI(body);
        break;
      case 'stability':
        imageUrl = await generateWithStability(body);
        break;
      case 'segmind':
        imageUrl = await generateWithSegmind(body);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      provider: provider,
      model: model,
      prompt: prompt
    });

  } catch (error: any) {
    console.error('Image generation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate image' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to generate images.' 
    },
    { status: 405 }
  );
}
