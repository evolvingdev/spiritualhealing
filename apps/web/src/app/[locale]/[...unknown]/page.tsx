import { notFound } from 'next/navigation';

/** Unknown paths render the localised not-found page (inside the locale layout). */
export default function UnknownPage(): never {
  notFound();
}
