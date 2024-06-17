import {
    StreamingTextResponse,
    Message,
    StreamData,
    LangChainAdapter,
    createStreamDataTransformer,
} from 'ai';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { BytesOutputParser } from '@langchain/core/output_parsers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { messages, selectedModel } = await req.json();

        const model = new ChatOllama({
            baseUrl:
                process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434',
            model: selectedModel,
        });

        const parser = new BytesOutputParser();

        const stream = await model
            .pipe(parser)
            .stream(
                (messages as Message[]).map((m) =>
                    m.role == 'user'
                        ? new HumanMessage(m.content)
                        : new AIMessage(m.content)
                )
            );

        /* return new StreamingTextResponse(
            stream.pipeThrough(createStreamDataTransformer())
        ); */

        const data = new StreamData();

        // data.append({ test: '--> Test Data Value' });
        try {
            const videoData = await getVideoDataFromApi('hello, how are you?');
            const videoDataBase64 = arrayBufferToBase64(videoData);
            data.append({ video: videoDataBase64 });
        } catch (error) {
            console.error('Failed to get video data:', error);
        }

        const readableStream = stream.pipeThrough(
            createStreamDataTransformer()
        );

        const aiStream = new ReadableStream({
            start(controller) {
                readableStream.pipeTo(
                    new WritableStream({
                        write(chunk) {
                            controller.enqueue(chunk);
                        },
                        close() {
                            controller.close();
                            data.close();
                        },
                        abort(err) {
                            controller.error(err);
                            data.close();
                        },
                    })
                );
            },
        });

        return new StreamingTextResponse(aiStream, {}, data);

        return new StreamingTextResponse(readableStream, {}, data);

        /*  try {
            const videoData = await getVideoDataFromApi('hello, how are you?');
            data.append(videoData);
        } catch (error) {
            console.error('Failed to get video data:', error);
        } */

        /* const readableStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    controller.enqueue(chunk);
                }
                controller.close();
            },
        }); */

        /* const aiStream = LangChainAdapter.toAIStream(readableStream, {
            onFinal() {
                data.close();
            },
        });

        return new StreamingTextResponse(aiStream, {}, data); */
    } catch (error) {
        console.error('Error in chat route:', error);
    }
}

async function getVideoDataFromApi(text: string) {
    const response = await fetch('http://ai.connected-in.co.kr:8000/', {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error(`Error fetching video data: ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    return videoBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
