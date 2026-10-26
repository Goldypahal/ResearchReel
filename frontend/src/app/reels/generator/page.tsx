import { redirect } from 'next/navigation';

/** The reel generator merged into the reel studio. */
export default function ReelGeneratorRedirect() {
  redirect('/reels/create');
}
