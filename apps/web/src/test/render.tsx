import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import messages from '@/messages/en-IN.json';

/** Renders a component with the English catalogue, as the app's layout provides it. */
export function renderWithIntl(ui: ReactElement): RenderResult {
  return render(
    <NextIntlClientProvider locale="en-IN" messages={messages} timeZone="Asia/Kolkata">
      {ui}
    </NextIntlClientProvider>,
  );
}
