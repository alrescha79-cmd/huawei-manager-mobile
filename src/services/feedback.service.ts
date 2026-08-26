export interface FeedbackPayload {
  name?: string;
  email: string;
  type: 'bug' | 'feature';
  modem?: string;
  message: string;
  botcheck?: string;
  startedAt?: number;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
}

const FEEDBACK_API_URL = 'https://hm.cakson.my.id/api/feedback';
const WEBSITE_ORIGIN = 'https://hm.cakson.my.id';

export async function sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const body = {
    name: (payload.name || '').trim(),
    email: (payload.email || '').trim(),
    type: payload.type || 'bug',
    modem: (payload.modem || '').trim(),
    message: (payload.message || '').trim(),
    botcheck: payload.botcheck || '',
    startedAt: payload.startedAt || Date.now(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(FEEDBACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: WEBSITE_ORIGIN,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success) {
      return { success: true };
    }

    return {
      success: false,
      message: data.message || `HTTP error ${response.status}`,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: error?.name === 'AbortError' ? 'Request timeout' : error?.message || 'Network error',
    };
  }
}
