import { NextRequest, NextResponse } from 'next/server';

interface ImageToImageRequest {
  prompt: string;
  negativePrompt?: string;
  provider: 'stability' | 'segmind' | 'openai';
  model: string;
  apiKey: string;
  sourceImageUrl: string;
  strength?: number;
  guidance?: number;
  steps?: number;
}

async function transformWithStability(request: ImageToImageRequest) {
  const { 
    prompt, 
    negativePrompt, 
    model, 
    apiKey, 
    sourceImageUrl,
    strength = 0.7,
    guidance = 7.5,
    steps = 20
  } = request;

  // Convert data URL to blob if needed
  let imageBlob: Blob;
  if (sourceImageUrl.startsWith('data:')) {
    const response = await fetch(sourceImageUrl);
    imageBlob = await response.blob();
  } else {
    const response = await fetch(sourceImageUrl);
    imageBlob = await response.blob();
  }

  const formData = new FormData();
  formData.append('init_image', imageBlob);
  formData.append('text_prompts[0][text]', prompt);
  formData.append('text_prompts[0][weight]', '1');
  
  if (negativePrompt) {
    formData.append('text_prompts[1][text]', negativePrompt);
    formData.append('text_prompts[1][weight]', '-1');
  }
  
  formData.append('cfg_scale', guidance.toString());
  formData.append('steps', steps.toString());
  formData.append('samples', '1');
  formData.append('image_strength', strength.toString());

  const response = await fetch(`https://api.stability.ai/v1/generation/${model}/image-to-image`, {
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
  
  // Convert base64 to data URL
  const base64Image = result.artifacts[0].base64;
  const imageUrl = `data:image/png;base64,${base64Image}`;
  
  return imageUrl;
}

async function transformWithSegmind(request: ImageToImageRequest) {
  const { 
    prompt, 
    negativePrompt, 
    apiKey, 
    sourceImageUrl,
    strength = 0.7,
    guidance = 7.5,
    steps = 20
  } = request;

  // Convert image to base64 if it's not already
  let base64Image: string;
  if (sourceImageUrl.startsWith('data:image')) {
    base64Image = sourceImageUrl.split(',')[1];
  } else {
    const response = await fetch(sourceImageUrl);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    base64Image = Buffer.from(buffer).toString('base64');
  }

  const response = await fetch('https://api.segmind.com/v1/sd1.5-img2img', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      negative_prompt: negativePrompt || '',
      image: base64Image,
      samples: 1,
      scheduler: 'UniPC',
      num_inference_steps: steps,
      guidance_scale: guidance,
      strength: strength,
      seed: Math.floor(Math.random() * 1000000),
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

async function transformWithOpenAI(request: ImageToImageRequest) {
  // OpenAI DALL-E doesn't have direct image-to-image, but we can use variations
  const { apiKey, sourceImageUrl } = request;

  // Convert data URL to blob if needed
  let imageBlob: Blob;
  if (sourceImageUrl.startsWith('data:')) {
    const response = await fetch(sourceImageUrl);
    imageBlob = await response.blob();
  } else {
    const response = await fetch(sourceImageUrl);
    imageBlob = await response.blob();
  }

  const formData = new FormData();
  formData.append('image', imageBlob);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('response_format', 'url');

  const response = await fetch('https://api.openai.com/v1/images/variations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data[0].url;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageToImageRequest = await request.json();
    
    const { prompt, provider, model, apiKey, sourceImageUrl } = body;
    
    // Validation
    if (!sourceImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Source image is required' },
        { status: 400 }
      );
    }
    
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

    let imageUrl: string;

    // Transform image based on provider
    switch (provider) {
      case 'stability':
        if (!prompt?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Prompt is required for Stability AI' },
            { status: 400 }
          );
        }
        imageUrl = await transformWithStability(body);
        break;
      case 'segmind':
        if (!prompt?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Prompt is required for Segmind' },
            { status: 400 }
          );
        }
        imageUrl = await transformWithSegmind(body);
        break;
      case 'openai':
        imageUrl = await transformWithOpenAI(body);
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
    console.error('Image transformation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to transform image' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to transform images.' 
    },
    { status: 405 }
  );
}
