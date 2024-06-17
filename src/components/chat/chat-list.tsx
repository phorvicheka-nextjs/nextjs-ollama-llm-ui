import { Message } from 'ai/react';
import { useChat } from '@ai-sdk/react';
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ChatProps } from './chat';
import Image from 'next/image';
import CodeDisplayBlock from '../code-display-block';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { INITIAL_QUESTIONS } from '@/utils/initial-questions';
import { Button } from '../ui/button';

interface VideoData {
    video: string;
}

export default function ChatList({
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    loadingSubmit,
    formRef,
    isMobile,
    data,
    isFinishedStreamText,
}: ChatProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [name, setName] = React.useState<string>('');
    const [localStorageIsLoading, setLocalStorageIsLoading] =
        React.useState(true);
    const [initialQuestions, setInitialQuestions] = React.useState<Message[]>(
        []
    );
    const [isFetchingVideoData, setIsFetchingVideoData] = React.useState(false);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isFinishedStreamText && data && data.length > 0) {
            const videoContainer = document.getElementById('video-container');
            if (videoContainer) {
                videoContainer.innerHTML = ''; // Clear the container first
                (data as VideoData[]).forEach((item: VideoData) => {
                    if (item.video) {
                        const videoBlob = base64ToBlob(
                            item.video,
                            'video/webm'
                        );
                        const videoUrl = URL.createObjectURL(videoBlob);
                        const videoElement = document.createElement('video');
                        videoElement.src = videoUrl;
                        videoElement.controls = true;
                        videoElement.autoplay = true; // Automatically play the video
                        videoContainer.appendChild(videoElement);
                    }
                });
            }
        }
    }, [data, isFinishedStreamText]);

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
            throw new Error(
                `Error fetching video data: ${response.statusText}`
            );
        }

        const videoBuffer = await response.arrayBuffer();
        return videoBuffer;
    }

    useEffect(() => {
        const fetchDataAndSetVideo = async () => {
            if (isFinishedStreamText) {
                try {
                    setIsFetchingVideoData(true);
                    console.log('fetching video data');
                    // Fetch video data from API
                    // const videoData = await getVideoDataFromApi(
                    //     messages[messages.length - 1].content
                    // );
                    const videoData = await getVideoDataFromApi(
                        'The capital of France is Paris.'
                    );

                    // Process video data and update the video container
                    const videoContainer = document.querySelector(
                        `.video-container-${messages.length - 1}`
                    );
                    if (videoContainer) {
                        videoContainer.innerHTML = ''; // Clear the container first

                        const videoBlob = new Blob([videoData], {
                            type: 'video/webm',
                        });
                        const videoUrl = URL.createObjectURL(videoBlob);
                        const videoElement = document.createElement('video');
                        videoElement.src = videoUrl;
                        videoElement.controls = true;
                        videoElement.autoplay = true; // Automatically play the video
                        videoContainer.appendChild(videoElement);
                    }
                } catch (error) {
                    console.error('Failed to get video data:', error);
                } finally {
                    setIsFetchingVideoData(false);
                }
            }
        };
        fetchDataAndSetVideo();
    }, [isFinishedStreamText]);

    function base64ToBlob(base64: string, type: string) {
        const binary = atob(base64);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: type });
    }

    useEffect(() => {
        const username = localStorage.getItem('ollama_user');
        if (username) {
            setName(username);
            setLocalStorageIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Fetch 4 initial questions
        if (messages.length === 0) {
            const questionCount = isMobile ? 2 : 4;

            setInitialQuestions(
                INITIAL_QUESTIONS.sort(() => Math.random() - 0.5)
                    .slice(0, questionCount)
                    .map((message) => {
                        return {
                            id: '1',
                            role: 'user',
                            content: message.content,
                        };
                    })
            );
        }
    }, [isMobile]);

    const onClickQuestion = (value: string, e: React.MouseEvent) => {
        e.preventDefault();

        handleInputChange({
            target: { value },
        } as React.ChangeEvent<HTMLTextAreaElement>);

        setTimeout(() => {
            formRef.current?.dispatchEvent(
                new Event('submit', {
                    cancelable: true,
                    bubbles: true,
                })
            );
        }, 1);
    };

    if (messages.length === 0) {
        return (
            <div className="w-full h-full flex justify-center items-center">
                <div className="relative flex flex-col gap-4 items-center justify-center w-full h-full">
                    <div></div>
                    <div className="flex flex-col gap-4 items-center">
                        <Image
                            src="/ollama.png"
                            alt="AI"
                            width={60}
                            height={60}
                            className="h-20 w-14 object-contain dark:invert"
                        />
                        <p className="text-center text-lg text-muted-foreground">
                            How can I help you today?
                        </p>
                    </div>

                    <div className="absolute bottom-0 w-full px-4 sm:max-w-3xl grid gap-2 sm:grid-cols-2 sm:gap-4 text-sm">
                        {/* Only display 4 random questions */}
                        {initialQuestions.length > 0 &&
                            initialQuestions.map((message) => {
                                const delay = Math.random() * 0.25;

                                return (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            scale: 1,
                                            y: 10,
                                            x: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: 0,
                                            x: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            scale: 1,
                                            y: 10,
                                            x: 0,
                                        }}
                                        transition={{
                                            opacity: { duration: 0.1, delay },
                                            scale: { duration: 0.1, delay },
                                            y: {
                                                type: 'spring',
                                                stiffness: 100,
                                                damping: 10,
                                                delay,
                                            },
                                        }}
                                        key={message.content}
                                    >
                                        <Button
                                            key={message.content}
                                            type="button"
                                            variant="outline"
                                            className="sm:text-start px-4 py-8 flex w-full justify-center sm:justify-start items-center text-sm whitespace-pre-wrap"
                                            onClick={(e) =>
                                                onClickQuestion(
                                                    message.content,
                                                    e
                                                )
                                            }
                                        >
                                            {message.content}
                                        </Button>
                                    </motion.div>
                                );
                            })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="scroller"
            className="w-full overflow-y-scroll overflow-x-hidden h-full justify-end"
        >
            <div className="w-full flex flex-col overflow-x-hidden overflow-y-hidden min-h-full justify-end">
                {messages.map((message, index) => (
                    <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, scale: 1, y: 20, x: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 1, y: 20, x: 0 }}
                        transition={{
                            opacity: { duration: 0.1 },
                            layout: {
                                type: 'spring',
                                bounce: 0.3,
                                duration:
                                    messages.indexOf(message) * 0.05 + 0.2,
                            },
                        }}
                        className={cn(
                            'flex flex-col gap-2 p-4 whitespace-pre-wrap',
                            message.role === 'user'
                                ? 'items-end'
                                : 'items-start'
                        )}
                    >
                        <div className="flex gap-3 items-center">
                            {message.role === 'user' && (
                                <div className="flex items-end gap-3">
                                    <span className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                                        {message.content}
                                    </span>
                                    <Avatar className="flex justify-start items-center overflow-hidden">
                                        <AvatarImage
                                            src="/"
                                            alt="user"
                                            width={6}
                                            height={6}
                                            className="object-contain"
                                        />
                                        <AvatarFallback>
                                            {name &&
                                                name
                                                    .substring(0, 2)
                                                    .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            {message.role === 'assistant' && (
                                <div className="flex items-end gap-2">
                                    <Avatar className="flex justify-start items-center">
                                        <AvatarImage
                                            src="/ollama.png"
                                            alt="AI"
                                            width={6}
                                            height={6}
                                            className="object-contain dark:invert"
                                        />
                                    </Avatar>
                                    <span className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                                        {/* Check if the message content contains a code block */}
                                        {message.content
                                            .split('```')
                                            .map((part, index) => {
                                                if (index % 2 === 0) {
                                                    return (
                                                        <Markdown
                                                            key={index}
                                                            remarkPlugins={[
                                                                remarkGfm,
                                                            ]}
                                                        >
                                                            {part}
                                                        </Markdown>
                                                    );
                                                } else {
                                                    return (
                                                        <pre
                                                            className="whitespace-pre-wrap"
                                                            key={index}
                                                        >
                                                            <CodeDisplayBlock
                                                                code={part}
                                                                lang=""
                                                            />
                                                        </pre>
                                                    );
                                                }
                                            })}
                                        {isFinishedStreamText && data && (
                                            <pre>
                                                {JSON.stringify(data, null, 2)}
                                            </pre>
                                        )}
                                        <div
                                            className={`video-container-${index} mt-4`}
                                        ></div>
                                        {isFetchingVideoData ||
                                        (isLoading &&
                                            messages.indexOf(message) ===
                                                messages.length - 1) ? (
                                            <span
                                                className="animate-pulse"
                                                aria-label="Typing"
                                            >
                                                ...
                                            </span>
                                        ) : null}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
                {loadingSubmit && (
                    <div className="flex pl-4 pb-4 gap-2 items-center">
                        <Avatar className="flex justify-start items-center">
                            <AvatarImage
                                src="/ollama.png"
                                alt="AI"
                                width={6}
                                height={6}
                                className="object-contain dark:invert"
                            />
                        </Avatar>
                        <div className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                            <div className="flex gap-1">
                                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
                                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_0.5s_ease-in-out_infinite] dark:bg-slate-300"></span>
                                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div id="anchor" ref={bottomRef}></div>
        </div>
    );
}
