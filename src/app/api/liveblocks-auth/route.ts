import { auth, currentUser } from '@clerk/nextjs/server';
import { Liveblocks } from '@liveblocks/node';
import { NextResponse } from 'next/server';

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
  try {
    const { room } = await request.json();

    // Get Clerk user info
    const { sessionClaims } = await auth();
    const user = await currentUser();

    if (!room || !user) {
      return NextResponse.json({ error: 'Room and user are required' }, { status: 400 });
    }

    // Use user's name and avatar, fallback if missing
    const name = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Anonymous';
    const avatar = user.imageUrl || '';

    // Optionally, generate a color based on the user's name
    const nameToNumber = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = Math.abs(nameToNumber) % 360;
    const color = `hsl(${hue}, 80%, 60%)`;

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name,
        avatar,
        color,
      },
    });

    session.allow(room, session.FULL_ACCESS);

    const { status, body } = await session.authorize();
    return new NextResponse(body, { status });
  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
