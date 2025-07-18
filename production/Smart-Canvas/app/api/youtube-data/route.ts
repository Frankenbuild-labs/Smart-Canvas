import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // For now, we'll extract basic info from the page
    // In production, you'd want to use YouTube Data API v3
    const videoData = await scrapeYouTubeData(url, videoId);

    return NextResponse.json({
      success: true,
      data: videoData
    });

  } catch (error: any) {
    console.error('YouTube processing error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process YouTube video'
    }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function scrapeYouTubeData(url: string, videoId: string) {
  try {
    // Fetch the YouTube page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page: ${response.status}`);
    }

    const html = await response.text();

    // Extract basic video information
    const title = extractTitle(html);
    const description = extractDescription(html);
    const channel = extractChannel(html);
    const duration = extractDuration(html);
    const views = extractViews(html);

    // For transcript, we'll provide a placeholder
    // In production, you'd use YouTube's transcript API or a service like youtube-transcript
    const transcript = await getTranscriptPlaceholder(videoId);

    return {
      title: title || 'YouTube Video',
      description: description || 'No description available',
      transcript: transcript,
      duration: duration || 'Unknown',
      views: views || 'Unknown',
      channel: channel || 'Unknown Channel',
      videoId: videoId
    };

  } catch (error) {
    console.error('Error scraping YouTube data:', error);
    throw new Error('Failed to extract video data');
  }
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].replace(' - YouTube', '').trim();
  }

  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
  if (ogTitleMatch) {
    return ogTitleMatch[1].trim();
  }

  return 'YouTube Video';
}

function extractDescription(html: string): string {
  const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
  if (ogDescMatch) {
    return ogDescMatch[1].trim();
  }

  const metaDescMatch = html.match(/<meta name="description" content="([^"]+)"/i);
  if (metaDescMatch) {
    return metaDescMatch[1].trim();
  }

  return 'No description available';
}

function extractChannel(html: string): string {
  const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
  if (channelMatch) {
    return channelMatch[1];
  }

  const authorMatch = html.match(/<meta name="author" content="([^"]+)"/i);
  if (authorMatch) {
    return authorMatch[1];
  }

  return 'Unknown Channel';
}

function extractDuration(html: string): string {
  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
  if (durationMatch) {
    const seconds = parseInt(durationMatch[1]);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return 'Unknown';
}

function extractViews(html: string): string {
  const viewsMatch = html.match(/"viewCount":"(\d+)"/);
  if (viewsMatch) {
    const views = parseInt(viewsMatch[1]);
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    } else {
      return `${views} views`;
    }
  }

  return 'Unknown';
}

async function getTranscriptPlaceholder(videoId: string): Promise<string> {
  // This is a placeholder. In production, you would:
  // 1. Use YouTube Data API v3 with captions endpoint
  // 2. Use a service like youtube-transcript npm package
  // 3. Use a third-party transcript service

  return `[Transcript for video ${videoId}]

This is a placeholder transcript. To get actual transcripts, you would need to:

1. Use YouTube Data API v3 with captions endpoint
2. Use a third-party service like youtube-transcript
3. Implement a proper transcript extraction service

The video content would appear here as a full text transcript, which could then be used for:
- Summarization
- Question answering
- Content analysis
- Translation
- And more AI-powered tasks

Note: This node is ready to be connected to other nodes like the Chat with Anything node for AI analysis of the video content.`;
}
