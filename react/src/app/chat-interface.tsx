"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AudioHandler } from "@/lib/audio";
import { ProactiveEventManager } from "@/lib/proactive-event-manager";
import { Power, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AvatarConfigVideoParams,
  Voice,
  EOUDetection,
  isFunctionCallItem,
  Modality,
  RTClient,
  RTInputAudioItem,
  RTResponse,
  TurnDetection,
} from "rt-client";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import "./index.css";
import {
  clearChatSvg,
  offSvg,
  recordingSvg,
  robotSvg,
  settingsSvg,
} from "./svg";

interface Message {
  type: "user" | "assistant" | "status" | "error";
  content: string;
}

interface ToolDeclaration {
  type: "function";
  name: string;
  parameters: object | null;
  description: string;
}

interface PredefinedScenario {
  name: string;
  instructions?: string;
  pro_active?: boolean;
  voice?: {
    custom_voice: boolean;
    deployment_id?: string;
    voice_name: string;
    temperature?: number;
  };
  avatar?: {
    enabled: boolean;
    customized: boolean;
    avatar_name: string;
  };
}

// Define predefined tool templates
const predefinedTools = [
  {
    id: "search",
    label: "Search",
    tool: {
      type: "function",
      name: "search",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      description:
        "Search the knowledge base. The knowledge base is in English, translate to and from English if " +
        "needed. Results are formatted as a source name first in square brackets, followed by the text " +
        "content, and a line with '-----' at the end of each result.",
    } as ToolDeclaration,
    enabled: true,
  },
  {
    id: "time",
    label: "Time Lookup",
    tool: {
      type: "function",
      name: "get_time",
      parameters: null,
      description: "Get the current time.",
    } as ToolDeclaration,
    enabled: true,
  },
  {
    id: "weather",
    label: "Weather Checking",
    tool: {
      type: "function",
      name: "get_weather",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location to check the weather for",
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Unit of temperature",
          },
        },
        required: ["location", "unit"],
        additionalProperties: false,
      },
      description:
        "Get the current weather. The location is a string, and the unit is either 'celsius' or 'fahrenheit'.",
    } as ToolDeclaration,
    enabled: false,
  },
  {
    id: "calculator",
    label: "Calculator",
    tool: {
      type: "function",
      name: "calculate",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression to calculate",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
      description: "Perform a calculation. The expression is a string.",
    } as ToolDeclaration,
    enabled: false,
  },
];

// Helper to map message type to ultra-modern class names
const getMessageClassNames = (type: Message["type"]): string => {
  switch (type) {
    case "user":
      return "bg-gradient-to-br from-primary/95 to-primary text-primary-foreground ml-auto max-w-[85%] shadow-lg shadow-primary/20 border border-primary/20";
    case "assistant":
      return "bg-gradient-to-br from-card/95 to-card/80 text-card-foreground mr-auto max-w-[85%] shadow-lg border border-border/20 backdrop-blur-xl";
    case "status":
      return "bg-gradient-to-br from-warning/90 to-warning/80 text-warning-foreground mx-auto max-w-[80%] shadow-lg border border-warning/20";
    default:
      return "bg-gradient-to-br from-destructive/90 to-destructive/80 text-destructive-foreground mx-auto max-w-[80%] shadow-lg border border-destructive/20";
  }
};

let peerConnection: RTCPeerConnection;

const defaultAvatar = "Lisa-casual-sitting";



// Define the list of available languages.
const availableLanguages = [
  { id: "auto", name: "Auto Detect" },
  { id: "en-US", name: "English (United States)" },
  { id: "zh-CN", name: "Chinese (China)" },
  { id: "de-DE", name: "German (Germany)" },
  { id: "en-GB", name: "English (United Kingdom)" },
  { id: "en-IN", name: "English (India)" },
  { id: "es-ES", name: "Spanish (Spain)" },
  { id: "es-MX", name: "Spanish (Mexico)" },
  { id: "fr-FR", name: "French (France)" },
  { id: "hi-IN", name: "Hindi (India)" },
  { id: "it-IT", name: "Italian (Italy)" },
  { id: "ja-JP", name: "Japanese (Japan)" },
  { id: "ko-KR", name: "Korean (South Korea)" },
  { id: "pt-BR", name: "Portuguese (Brazil)" },
];

// Define the list of available turn detection.
const availableTurnDetection = [
  { id: "server_vad", name: "Server VAD", disable: false },
  {
    id: "azure_semantic_vad",
    name: "Azure Semantic VAD",
    disabled: false,
  },
  // { id: "none", name: "None", disable: true },
];

const availableEouDetection = [
  { id: "none", name: "Disabled", disabled: false },
  { id: "semantic_detection_v1", name: "Semantic Detection", disabled: false },
];

// Define the updated list of available voices.
const availableVoices = [
  // openai voices:  "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse"
  {
    id: "en-us-ava:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Ava (HD)",
  },
  {
    id: "en-us-steffan:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Steffan (HD)",
  },
  {
    id: "en-us-andrew:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Andrew (HD)",
  },
  {
    id: "zh-cn-xiaochen:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Xiaochen (HD)",
  },
  {
    id: "en-us-emma:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Emma (HD)",
  },
  {
    id: "en-us-emma2:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Emma (HD 2)",
  },
  {
    id: "en-us-andrew2:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Andrew (HD 2)",
  },
  {
    id: "de-DE-Seraphina:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Seraphina (HD)",
  },
  {
    id: "en-us-aria:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Aria (HD)",
  },
  {
    id: "en-us-davis:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Davis (HD)",
  },
  {
    id: "en-us-jenny:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Jenny (HD)",
  },
  {
    id: "ja-jp-masaru:DragonHDLatestNeural",
    name: "DragonHDLatestNeural, Masaru (HD)",
  },
  { id: "en-US-AvaMultilingualNeural", name: "Ava Multilingual" },
  {
    id: "en-US-AlloyTurboMultilingualNeural",
    name: "Alloy Turbo Multilingual",
  },
  { id: "en-US-AndrewNeural", name: "Andrew" },
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew Multilingual" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian Multilingual" },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma Multilingual" },
  {
    id: "en-US-NovaTurboMultilingualNeural",
    name: "Nova Turbo Multilingual",
  },
  { id: "zh-CN-XiaoxiaoMultilingualNeural", name: "Xiaoxiao Multilingual" },
  { id: "en-US-AvaNeural", name: "Ava" },
  { id: "en-US-JennyNeural", name: "Jenny" },
  { id: "zh-HK-HiuMaanNeural", name: "HiuMaan (Cantonese)" },
  { id: "mt-MT-JosephNeural", name: "Joseph (Maltese)" },
  { id: "zh-cn-xiaoxiao2:DragonHDFlashLatestNeural", name: "Xiaoxiao2 HDFlash" },
  { id: "zh-cn-yunyi:DragonHDFlashLatestNeural", name: "Yunyi HDFlash" },
  {
    id: "alloy",
    name: "Alloy (OpenAI)",
  },
  {
    id: "ash",
    name: "Ash (OpenAI)",
  },
  {
    id: "ballad",
    name: "Ballad (OpenAI)",
  },
  {
    id: "coral",
    name: "Coral (OpenAI)",
  },
  {
    id: "echo",
    name: "Echo (OpenAI)",
  },
  {
    id: "sage",
    name: "Sage (OpenAI)",
  },
  {
    id: "shimmer",
    name: "Shimmer (OpenAI)",
  },
  {
    id: "verse",
    name: "Verse (OpenAI)",
  },
];

const avatarNames = [
  "Harry-business",
  "Harry-casual",
  "Harry-youthful",
  "Jeff-business",
  "Jeff-formal",
  "Lisa-casual-sitting",
  "Lori-casual",
  "Lori-formal",
  "Lori-graceful",
  "Max-business",
  "Max-casual",
  "Max-formal",
  "Meg-business",
  "Meg-casual",
  "Meg-formal",
];

let intervalId: NodeJS.Timeout | null = null;

const ChatInterface = () => {
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [entraToken, setEntraToken] = useState("");
  const [model, setModel] = useState("gpt-4o-realtime-preview");
  const [searchEndpoint, setSearchEndpoint] = useState("");
  const [searchApiKey, setSearchApiKey] = useState("");
  const [searchIndex, setSearchIndex] = useState("");
  const [searchContentField, setSearchContentField] = useState("chunk");
  const [searchIdentifierField, setSearchIdentifierField] = useState("chunk_id");
  const [recognitionLanguage, setRecognitionLanguage] = useState("auto");
  const [useNS, setUseNS] = useState(false);
  const [useEC, setUseEC] = useState(false);
  const [turnDetectionType, setTurnDetectionType] = useState<TurnDetection>({
    type: "server_vad",
  });
  const [eouDetectionType, setEouDetectionType] = useState<string>("none");
  const [removeFillerWords, setRemoveFillerWords] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [enableProactive, setEnableProactive] = useState(false);
  const [temperature, setTemperature] = useState(0.9);
  const [voiceTemperature, setVoiceTemperature] = useState(0.9);
  const [useCNV, setUseCNV] = useState(false);
  const [voiceName, setVoiceName] = useState("en-US-AvaNeural");
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [avatarName, setAvatarName] = useState(defaultAvatar);
  const [customAvatarName, setCustomAvatarName] = useState("");
  const [voiceDeploymentId, setVoiceDeploymentId] = useState("");
  const [tools, setTools] = useState<ToolDeclaration[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvatar, setIsAvatar] = useState(true);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  
  // Remove batch avatar synthesis - using real-time avatar instead
  const [isDevelop, setIsDevelop] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [audioDataArray, setAudioDataArray] = useState<Uint8Array | null>(null);
  // Add new state variables for predefined scenarios
  const [predefinedScenarios, setPredefinedScenarios] = useState<
    Record<string, PredefinedScenario>
  >({});
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [isSettings, setIsSettings] = useState(false);

  // Add mode state and agent fields
  const [mode, setMode] = useState<"model" | "agent">("agent");
  const [agentProjectName, setAgentProjectName] = useState("");
  const [agentId, setAgentId] = useState("");
  // const [agentAccessToken, setAgentAccessToken] = useState("");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const clientRef = useRef<RTClient | null>(null);
  const audioHandlerRef = useRef<AudioHandler | null>(null);
  const proactiveManagerRef = useRef<ProactiveEventManager | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const isUserSpeaking = useRef(false);
  const searchClientRef = useRef<SearchClient<object> | null>(null);
  const animationRef = useRef(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const isEnableAvatar = isAvatar && (avatarName || customAvatarName);

  // Fetch configuration from /config endpoint when component loads
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/config");
        if (response.status === 404) {
          setConfigLoaded(false);
          return;
        }

        const config = await response.json();
        if (config.endpoint) {
          setEndpoint(config.endpoint);
        }
        if (config.token) {
          setEntraToken(config.token);
        }
        if (config.pre_defined_scenarios) {
          setPredefinedScenarios(config.pre_defined_scenarios);
        }
        // Parse agent configs from /config
        if (config.agent && config.agent.project_name) {
          // setAgentAccessToken(config.agent.access_token);
          setAgentProjectName(config.agent.project_name);
          if (Array.isArray(config.agent.agents)) {
            setAgents(config.agent.agents);
            // If only one agent, auto-select it
            if (config.agent.agents.length === 1) {
              setAgentId(config.agent.agents[0].id);
            }
          }
        }
        setConfigLoaded(true);
      } catch (error) {
        console.error("Failed to fetch config:", error);
        setConfigLoaded(true);
      }
    };

    fetchConfig();
  }, []);

  const handleConnect = async () => {
    if (!isConnected) {
      try {
        setIsConnecting(true);

        // Refresh the token before connecting
        if (configLoaded) {
          try {
            const response = await fetch("/config");
            if (response.ok) {
              const config = await response.json();
              if (config.endpoint) {
                setEndpoint(config.endpoint);
              }
              if (config.token) {
                setEntraToken(config.token);
              }
            }
          } catch (error) {
            console.error("Failed to refresh token:", error);
            // Continue with existing token if refresh fails
          }
        }

        // Use agent fields if in agent mode
        const clientAuth = entraToken
          ? {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getToken: async (_: string) => ({
              token: entraToken,
              expiresOnTimestamp: Date.now() + 3600000,
            }),
          }
          : { key: apiKey };
        if (mode === "agent" && !agentId) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              type: "error",
              content: "Please input/select an agent.",
            },
          ]);
          return;
        }
        clientRef.current = new RTClient(
          new URL(endpoint),
          clientAuth,
          mode === "agent"
            ? {
              modelOrAgent: {
                agentId,
                projectName: agentProjectName,
                agentAccessToken: entraToken,
              },
              apiVersion: "2025-05-01-preview",
            }
            : {
              modelOrAgent: model,
              apiVersion: "2025-05-01-preview",
            }
        );
        console.log("Client created:", clientRef.current.connectAvatar);
        const modalities: Modality[] = ["text", "audio"];
        const turnDetection: TurnDetection = turnDetectionType;
        if (
          turnDetection &&
          eouDetectionType !== "none" &&
          isCascaded(mode, model)
        ) {
          turnDetection.end_of_utterance_detection = {
            model: eouDetectionType,
          } as EOUDetection;
        }
        if (turnDetection?.type === "azure_semantic_vad") {
          turnDetection.remove_filler_words = removeFillerWords;
        }
        const voice: Voice = useCNV
          ? {
            name: customVoiceName,
            endpoint_id: voiceDeploymentId,
            temperature: customVoiceName.toLowerCase().includes("dragonhd")
              ? voiceTemperature
              : undefined,
            type: "azure-custom",
          }
          : voiceName.includes("-")
            ? {
              name: voiceName,
              type: "azure-standard",
              temperature: voiceName.toLowerCase().includes("dragonhd")
                ? voiceTemperature
                : undefined,
            }
            : (voiceName as Voice);
        if (enableSearch) {
          searchClientRef.current = new SearchClient(
            searchEndpoint,
            searchIndex,
            new AzureKeyCredential(searchApiKey)
          );
        }
        const session = await clientRef.current.configure({
          instructions: instructions?.length > 0 ? instructions : undefined,
          input_audio_transcription: {
            model: model.includes("realtime-preview")
              ? "whisper-1"
              : "azure-fast-transcription",
            language:
              recognitionLanguage === "auto" ? undefined : recognitionLanguage,
          },
          turn_detection: turnDetection,
          voice: voice,
          avatar: getAvatarConfig(),
          tools,
          temperature,
          modalities,
          input_audio_noise_reduction: useNS
            ? {
              type: "azure_deep_noise_suppression",
            }
            : null,
          input_audio_echo_cancellation: useEC
            ? {
              type: "server_echo_cancellation",
            }
            : null,
        });
        if (session?.avatar) {
          await getLocalDescription(session.avatar?.ice_servers);
        }

        startResponseListener();
        // Start recording the session
        if (audioHandlerRef.current) {
          audioHandlerRef.current.startSessionRecording();
        }

        setIsConnected(true);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            type: "status",
            content:
              "Session started, click on the mic button to start conversation! debug id: " +
              session.id,
          },
        ]);

        setSessionId(session.id);

        if (enableProactive) {
          proactiveManagerRef.current = new ProactiveEventManager(
            whenGreeting,
            whenInactive,
            10000
          );
          proactiveManagerRef.current.start();
        }
      } catch (error) {
        console.error("Connection failed:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            type: "error",
            content: "Error connecting to the server: " + error,
          },
        ]);
      } finally {
        setIsConnecting(false);
      }
    } else {
      clearVideo();
      await disconnect();
    }
  };

  const whenGreeting = async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.generateResponse({ additional_instructions: " Welcome the user." });
      } catch (error) {
        console.error("Error generating greeting message:", error);
      }
    }
  };

  const whenInactive = async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.sendItem({
          type: "message",
          role: "system",
          content: [
            {
              type: "input_text",
              text: "User hasn't response for a while, please say something to continue the conversation.",
            },
          ],
        });
        await clientRef.current.generateResponse();
      } catch (error) {
        console.error("Error sending no activity message:", error);
      }
    }
  };

  const getAvatarConfig = () => {
    if (!isAvatar) {
      return undefined;
    }

    const videoParams: AvatarConfigVideoParams = {
      codec: "h264",
      crop: {
        top_left: [560, 0],
        bottom_right: [1360, 1080],
      },
      // uncomment the following to set avatar background color or image.
      // background: {
      // color: "#00FF00FF",
      //   image_url: new URL("https://sample-videos.com/img/Sample-jpg-image-50kb.jpg")
      // }
    };

    if (isCustomAvatar && customAvatarName) {
      return {
        character: customAvatarName,
        customized: true,
        video: videoParams,
      };
    } else if (isAvatar && !isCustomAvatar) {
      return {
        character: avatarName.split("-")[0].toLowerCase(),
        style: avatarName.split("-").slice(1).join("-"),
        video: videoParams,
      };
    } else {
      return undefined;
    }
  };

  const disconnect = async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.close();
        clientRef.current = null;
        peerConnection = null as unknown as RTCPeerConnection;
        setIsConnected(false);
        audioHandlerRef.current?.stopStreamingPlayback();
        proactiveManagerRef.current?.stop();
        isUserSpeaking.current = false;
        audioHandlerRef.current?.stopRecordAnimation();
        audioHandlerRef.current?.stopPlayChunkAnimation();
        if (isRecording) {
          audioHandlerRef.current?.stopRecording();
          setIsRecording(false);
        }

        // Stop recording and check if there's any recorded audio
        if (audioHandlerRef.current) {
          audioHandlerRef.current.stopSessionRecording();
          setHasRecording(audioHandlerRef.current.hasRecordedAudio());
        }
      } catch (error) {
        console.error("Disconnect failed:", error);
      }
    }
  };

  const handleResponse = async (response: RTResponse) => {
    for await (const item of response) {
      if (item.type === "message" && item.role === "assistant") {
        const message: Message = {
          type: item.role,
          content: "",
        };
        setMessages((prevMessages) => [...prevMessages, message]);
        let fullContent = "";
        
        for await (const content of item) {
          if (content.type === "text") {
            for await (const text of content.textChunks()) {
              message.content += text;
              fullContent += text;
              setMessages((prevMessages) => {
                if (prevMessages[prevMessages.length - 1]?.content) {
                  prevMessages[prevMessages.length - 1].content =
                    message.content;
                }
                return [...prevMessages];
              });
            }
          } else if (content.type === "audio") {
            const textTask = async () => {
              for await (const text of content.transcriptChunks()) {
                message.content += text;
                fullContent += text;
                setMessages((prevMessages) => {
                  if (prevMessages[prevMessages.length - 1]?.content) {
                    prevMessages[prevMessages.length - 1].content =
                      message.content;
                  }
                  return [...prevMessages];
                });
              }
            };
            const audioTask = async () => {
              audioHandlerRef.current?.stopStreamingPlayback(); // stop any previous playback
              audioHandlerRef.current?.startStreamingPlayback();
              for await (const audio of content.audioChunks()) {
                audioHandlerRef.current?.playChunk(audio, async () => {
                  proactiveManagerRef.current?.updateActivity("agent speaking");
                });
              }
            };
            await Promise.all([textTask(), audioTask()]);
          }
        }
        
        // Real-time avatar is already handled by the RT Client, no need for additional synthesis
      } else if (isFunctionCallItem(item)) {
        await item.waitForCompletion();
        console.log("Function call output:", item);
        if (item.functionName === "get_time") {
          const formattedTime = new Date().toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
          });
          console.log("Current time:", formattedTime);
          await clientRef.current?.sendItem({
            type: "function_call_output",
            output: formattedTime,
            call_id: item.callId,
          });
          await clientRef.current?.generateResponse();
        } else if (item.functionName === "search") {
          const query = JSON.parse(item.arguments).query;
          console.log("Search query:", query);
          if (searchClientRef.current) {
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                type: "status",
                content: `Searching [${query}]...`,
              },
            ]);
            const searchResults = await searchClientRef.current.search(query, {
              top: 5,
              queryType: "semantic",
              semanticSearchOptions: {
                configurationName: "default", // this is hardcoded for now.
              },
              select: [searchContentField, searchIdentifierField],
            });
            let resultText = "";
            for await (const result of searchResults.results) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const document = result.document as any;
              resultText += `[${document[searchIdentifierField]}]: ${document[searchContentField]}\n-----\n`;
            }
            console.log("Search results:", resultText);
            await clientRef.current?.sendItem({
              type: "function_call_output",
              output: resultText,
              call_id: item.callId,
            });
            await clientRef.current?.generateResponse();
          }
        }
      }
    }
    if (response.status === "failed") {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "error",
          content: "Response failed:" + JSON.stringify(response.statusDetails),
        },
      ]);
    }
  };

  const handleInputAudio = async (item: RTInputAudioItem) => {
    isUserSpeaking.current = true;
    audioHandlerRef.current?.stopStreamingPlayback();
    await item.waitForCompletion();
    isUserSpeaking.current = false;
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        type: "user",
        content: item.transcription || "",
      },
    ]);
  };

  const startResponseListener = async () => {
    if (!clientRef.current) return;

    try {
      for await (const serverEvent of clientRef.current.events()) {
        if (serverEvent.type === "response") {
          await handleResponse(serverEvent);
        } else if (serverEvent.type === "input_audio") {
          proactiveManagerRef.current?.updateActivity("user start to speak"); // user started to speak
          await handleInputAudio(serverEvent);
        }
      }
    } catch (error) {
      if (clientRef.current) {
        console.error("Response iteration error:", error);
      }
    }
  };

  const sendMessage = async () => {
    if (currentMessage.trim() && clientRef.current) {
      try {
        const temporaryStorageMessage = currentMessage;
        setCurrentMessage("");
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            type: "user",
            content: temporaryStorageMessage,
          },
        ]);

        await clientRef.current.sendItem({
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: temporaryStorageMessage }],
        });
        await clientRef.current.generateResponse();
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const toggleRecording = async () => {
    if (!isRecording && clientRef.current) {
      try {
        if (!audioHandlerRef.current) {
          audioHandlerRef.current = new AudioHandler();
          await audioHandlerRef.current.initialize();
        }
        await audioHandlerRef.current.startRecording(async (chunk) => {
          await clientRef.current?.sendAudio(chunk);
          if (isUserSpeaking.current) {
            proactiveManagerRef.current?.updateActivity("user speaking");
          }
        });
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
      }
    } else if (audioHandlerRef.current) {
      try {
        audioHandlerRef.current.stopRecording();
        audioHandlerRef.current.stopRecordAnimation();
        if (turnDetectionType === null) {
          const inputAudio = await clientRef.current?.commitAudio();
          proactiveManagerRef.current?.updateActivity("user speaking");
          await handleInputAudio(inputAudio!);
          await clientRef.current?.generateResponse();
        }
        setIsRecording(false);
      } catch (error) {
        console.error("Failed to stop recording:", error);
      }
    }
  };

  const getLocalDescription = (ice_servers?: RTCIceServer[]) => {
    console.log("Received ICE servers" + JSON.stringify(ice_servers));

    peerConnection = new RTCPeerConnection({ iceServers: ice_servers });

    setupPeerConnection();

    peerConnection.onicegatheringstatechange = (): void => {
      if (peerConnection.iceGatheringState === "complete") {
      }
    };

    peerConnection.onicecandidate = (
      event: RTCPeerConnectionIceEvent
    ): void => {
      if (!event.candidate) {
      }
    };

    setRemoteDescription();
  };

  const setRemoteDescription = async () => {
    try {
      const sdp = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(sdp);

      // sleep 2 seconds to wait for ICE candidates to be gathered
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(clientRef.current);

      const remoteDescription = await clientRef.current?.connectAvatar(
        peerConnection.localDescription as RTCSessionDescription
      );
      await peerConnection.setRemoteDescription(
        remoteDescription as RTCSessionDescriptionInit
      );
    } catch (error) {
      console.error("Connection failed:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "error",
          content: "Error establishing avatar connection: " + error,
        },
      ]);
    }
  };

  const setupPeerConnection = () => {
    clearVideo();

    peerConnection.ontrack = function (event) {
      const mediaPlayer = document.createElement(
        event.track.kind
      ) as HTMLMediaElement;
      mediaPlayer.id = event.track.kind;
      mediaPlayer.srcObject = event.streams[0];
      mediaPlayer.autoplay = true;
      videoRef?.current?.appendChild(mediaPlayer);
    };

    peerConnection.addTransceiver("video", { direction: "sendrecv" });
    peerConnection.addTransceiver("audio", { direction: "sendrecv" });

    peerConnection.addEventListener("datachannel", (event) => {
      const dataChannel = event.channel;
      dataChannel.onmessage = (e) => {
        console.log(
          "[" + new Date().toISOString() + "] WebRTC event received: " + e.data
        );
      };
      dataChannel.onclose = () => {
        console.log("Data channel closed");
      };
    });
    peerConnection.createDataChannel("eventChannel");
  };

  const clearVideo = () => {
    const videoElement = videoRef?.current;

    // Clean up existing video element if there is any
    if (videoElement?.innerHTML) {
      videoElement.innerHTML = "";
    }
  };

  const downloadRecording = () => {
    if (audioHandlerRef.current) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      audioHandlerRef.current.downloadRecording(
        `conversation-${timestamp}`,
        sessionId
      );
    }
  };

  useEffect(() => {
    const initAudioHandler = async () => {
      const handler = new AudioHandler();
      await handler.initialize();
      audioHandlerRef.current = handler;
    };

    initAudioHandler().catch(console.error);

    return () => {
      disconnect();
      audioHandlerRef.current?.close().catch(console.error);
      // Clean up audio analyser
      if (audioAnalyser) {
        try {
          audioAnalyser.disconnect();
        } catch (error) {
          console.log('Error disconnecting audio analyser:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    const element = document.getElementById("messages-area");
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Function to detect mobile devices
    const checkForMobileDevice = () => {
      const userAgent = navigator.userAgent;
      const isMobileCheck =
        /iPad|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      setIsMobile(isMobileCheck);
    };

    // Run the check when component mounts
    checkForMobileDevice();

    // Optionally, could add window resize listener here if needed
    // to detect orientation changes or responsive breakpoints
  }, []);

  useEffect(() => {
    const element = animationRef.current;
    if (isConnected && element && !isEnableAvatar) {
      audioHandlerRef.current?.setCircleElement(element);
    } else {
      audioHandlerRef.current?.setCircleElement(null);
    }
  }, [isConnected, isEnableAvatar]);

  useEffect(() => {
    if (isConnected && isEnableAvatar && isRecording) {
      intervalId = setInterval(() => {
        for (let i = 0; i < 20; i++) {
          const ele = document.getElementById(`item-${i}`);
          const height = 50 * Math.sin((Math.PI / 20) * i) * Math.random();
          if (ele) {
            ele.style.transition = "height 0.15s ease";
            ele.style.height = `${height}px`;
          }
        }
      }, 150);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  }, [isConnected, isEnableAvatar, isRecording]);

  // Voice activity level simulation
  useEffect(() => {
    let activityInterval: NodeJS.Timeout;
    
    if (isConnected && isRecording) {
      // Try to get real audio data if available
      if (audioAnalyser && audioDataArray) {
        activityInterval = setInterval(() => {
          audioAnalyser.getByteFrequencyData(audioDataArray);
          
          // Calculate average volume from frequency data
          let sum = 0;
          for (let i = 0; i < audioDataArray.length; i++) {
            sum += audioDataArray[i];
          }
          const average = sum / audioDataArray.length;
          
          // Convert to a more usable range (0-30)
          const normalizedLevel = Math.min(30, (average / 255) * 30);
          setVoiceActivityLevel(normalizedLevel);
        }, 50); // Update more frequently for real-time response
      } else {
        // Fallback to simulation if no audio analyser
        activityInterval = setInterval(() => {
          if (isUserSpeaking.current) {
            // Higher activity when user is speaking
            setVoiceActivityLevel(15 + Math.random() * 10);
          } else {
            // Lower baseline activity when just listening
            setVoiceActivityLevel(2 + Math.random() * 5);
          }
        }, 100);
      }
    } else {
      setVoiceActivityLevel(0);
    }

    return () => {
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, [isConnected, isRecording, audioAnalyser, audioDataArray]);

  // Setup audio analyser for real voice activity detection
  useEffect(() => {
    const setupAudioAnalyser = async () => {
      if (isRecording && !audioAnalyser) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          source.connect(analyser);
          
          setAudioAnalyser(analyser);
          setAudioDataArray(dataArray);
        } catch (error) {
          console.log('Could not access microphone for voice activity analysis:', error);
          // Will fall back to simulation
        }
      }
    };

    if (isRecording) {
      setupAudioAnalyser();
    } else {
      // Clean up when not recording
      if (audioAnalyser) {
        try {
          audioAnalyser.disconnect();
        } catch (error) {
          console.log('Error disconnecting audio analyser:', error);
        }
        setAudioAnalyser(null);
        setAudioDataArray(null);
      }
    }
  }, [isRecording, audioAnalyser]);

  // Apply settings from a predefined scenario
  const applyScenario = (scenarioKey: string) => {
    const scenario = predefinedScenarios[scenarioKey];
    if (!scenario) return;

    // Apply instructions
    if (scenario.instructions) {
      setInstructions(scenario.instructions);
    }

    // Apply proactive setting
    if (scenario.pro_active !== undefined) {
      setEnableProactive(scenario.pro_active);
    }

    // Apply voice settings
    if (scenario.voice) {
      if (scenario.voice.custom_voice) {
        setUseCNV(true);
        if (scenario.voice.deployment_id) {
          setVoiceDeploymentId(scenario.voice.deployment_id);
        }
        if (scenario.voice.voice_name) {
          setCustomVoiceName(scenario.voice.voice_name);
        }
        if (scenario.voice.temperature) {
          setVoiceTemperature(scenario.voice.temperature);
        }
      } else {
        setUseCNV(false);
        if (scenario.voice.voice_name) {
          setVoiceName(scenario.voice.voice_name);
        }
      }
    }

    // Apply avatar settings
    if (scenario.avatar) {
      setIsAvatar(scenario.avatar.enabled);
      if (scenario.avatar.enabled) {
        setIsCustomAvatar(scenario.avatar.customized);
        if (scenario.avatar.customized) {
          setCustomAvatarName(scenario.avatar.avatar_name);
        } else {
          setAvatarName(scenario.avatar.avatar_name);
        }
      }
    } else {
      setIsAvatar(false);
    }

    // Update selected scenario
    setSelectedScenario(scenarioKey);
  };

  // Returns true if agent mode is enabled or a cascaded model is selected
  function isCascaded(mode: "model" | "agent", model: string): boolean {
    if (mode === "agent") return true;
    // Add all cascaded model names here
    const cascadedModels = [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "phi4-mini",
    ];
    return cascadedModels.includes(model);
  }

  function handleSettings() {
    if (settingsRef.current) {
      if (isSettings) {
        settingsRef.current.style.display = "block";
        setIsSettings(false);
      } else {
        settingsRef.current.style.display = "none";
        setIsSettings(true);
      }
    }
  }

  // Apple-like message styling function
  const getMessageClassNames = (type: "user" | "assistant" | "status" | "error") => {
    const baseClasses = "max-w-[85%] shadow-lg backdrop-blur-sm border transition-all duration-300 ease-apple";
    
    switch (type) {
      case "user":
        return `${baseClasses} ml-auto bg-primary text-primary-foreground border-primary/20 shadow-primary/25`;
      case "assistant":
        return `${baseClasses} mr-auto bg-secondary text-secondary-foreground border-border/30 shadow-lg`;
      case "status":
        return `${baseClasses} mx-auto bg-muted text-muted-foreground border-muted-foreground/20 text-center text-sm shadow-sm`;
      case "error":
        return `${baseClasses} mx-auto bg-destructive/20 text-destructive border-destructive/30 text-center shadow-destructive/25`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="flex h-screen bg-background interactive-bg">
      {/* Modern Settings Sidebar */}
      <div
        className={`modern-card border-r border-border/50 flex flex-col sidebar-transition ${
          isConnected ? 'sidebar-hidden' : 'sidebar-visible'
        }`}
        ref={settingsRef}
        style={{ borderRadius: 0 }}
      >
        {/* Settings Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <svg className="h-4 w-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">Configure your AI assistant</p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Connection Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Connection</h3>
            
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mode</label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as "model" | "agent")}
                disabled={isConnected}
              >
                <SelectTrigger className="modern-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Endpoint */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Endpoint</label>
              <Input
                placeholder="Azure AI Services Endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                disabled={isConnected || configLoaded}
                className="modern-input"
              />
            </div>

            {/* API Key or Token */}
            {(!configLoaded && mode === "model") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">API Key</label>
                <Input
                  placeholder="Subscription Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnected}
                  className="modern-input"
                  type="password"
                />
              </div>
            )}
            
            {mode === "agent" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Entra Token</label>
                <Input
                  placeholder="Entra Token"
                  value={entraToken}
                  onChange={(e) => setEntraToken(e.target.value)}
                  disabled={isConnected}
                  className="modern-input"
                  type="password"
                />
              </div>
            )}

            {/* Agent/Model specific settings */}
            {mode === "agent" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Project Name</label>
                  <Input
                    placeholder="Agent Project Name"
                    value={agentProjectName}
                    onChange={(e) => setAgentProjectName(e.target.value)}
                    disabled={isConnected}
                    className="modern-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Agent</label>
                  {agents.length > 0 ? (
                    <Select
                      value={agentId}
                      onValueChange={setAgentId}
                      disabled={isConnected}
                    >
                      <SelectTrigger className="modern-input">
                        <SelectValue placeholder="Select Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name || agent.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Agent ID"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      disabled={isConnected}
                      className="modern-input"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Model</label>
                <Select
                  value={model}
                  onValueChange={setModel}
                  disabled={isConnected}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-realtime-preview">GPT-4o Realtime</SelectItem>
                    <SelectItem value="gpt-4o-mini-realtime-preview">GPT-4o Mini Realtime</SelectItem>
                    <SelectItem value="gpt-4.1">GPT-4.1 (Cascaded)</SelectItem>
                    <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini (Cascaded)</SelectItem>
                    <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano (Cascaded)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Cascaded)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Cascaded)</SelectItem>
                    <SelectItem value="phi4-mm">Phi4-MM Realtime</SelectItem>
                    <SelectItem value="phi4-mini">Phi4 Mini (Cascaded)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Audio</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Noise Suppression</span>
                <Switch
                  checked={useNS}
                  onCheckedChange={setUseNS}
                  disabled={isConnected}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Echo Cancellation</span>
                <Switch
                  checked={useEC}
                  onCheckedChange={setUseEC}
                  disabled={isConnected}
                />
              </div>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Custom Voice</span>
                <Switch
                  checked={useCNV}
                  onCheckedChange={setUseCNV}
                  disabled={isConnected}
                />
              </div>

              {useCNV ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Voice Deployment ID"
                    value={voiceDeploymentId}
                    onChange={(e) => setVoiceDeploymentId(e.target.value)}
                    disabled={isConnected}
                    className="modern-input"
                  />
                  <Input
                    placeholder="Voice Name"
                    value={customVoiceName}
                    onChange={(e) => setCustomVoiceName(e.target.value)}
                    disabled={isConnected}
                    className="modern-input"
                  />
                </div>
              ) : (
                <Select
                  value={voiceName}
                  onValueChange={setVoiceName}
                  disabled={isConnected}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select Voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices
                      .filter(voice => !(isCascaded(mode, model) && !voice.id.includes("-")))
                      .map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Avatar Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Avatar</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Enable Avatar</span>
              <Switch
                checked={isAvatar}
                onCheckedChange={setIsAvatar}
                disabled={isConnected}
              />
            </div>

            {isAvatar && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Custom Avatar</span>
                  <Switch
                    checked={isCustomAvatar}
                    onCheckedChange={setIsCustomAvatar}
                    disabled={isConnected}
                  />
                </div>

                {isCustomAvatar ? (
                  <Input
                    placeholder="Custom Avatar Character"
                    value={customAvatarName}
                    onChange={(e) => setCustomAvatarName(e.target.value)}
                    disabled={isConnected}
                    className="modern-input"
                  />
                ) : (
                  <Select
                    value={avatarName}
                    onValueChange={setAvatarName}
                    disabled={isConnected}
                  >
                    <SelectTrigger className="modern-input">
                      <SelectValue placeholder="Select Avatar" />
                    </SelectTrigger>
                    <SelectContent>
                      {avatarNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Connect Button */}
        <div className="p-6 border-t border-border/50">
          <button
            className="w-full h-12 font-semibold transition-all duration-300 rounded-xl shadow-lg border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isConnected 
                ? 'rgb(248, 58, 58)' // destructive color from CSS
                : 'rgb(88, 96, 246)', // primary color from CSS
              color: 'rgb(255, 255, 255)', // white foreground
              border: 'none',
            }}
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </div>
            ) : isConnected ? (
              "Disconnect"
            ) : (
              "Connect"
            )}
          </button>

          {hasRecording && !isConnected && (
            <button
              className="w-full h-10 mt-3 font-medium transition-all duration-300 rounded-xl shadow-lg border-0 cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'rgb(16, 16, 20)', // secondary color from CSS
                color: 'rgb(248, 248, 248)', // secondary-foreground color from CSS
                border: 'none',
              }}
              onClick={downloadRecording}
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Download Recording
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-gradient-to-br from-transparent via-white/20 to-white/40 dark:from-transparent dark:via-black/30 dark:to-black/50 interactive-bg ${isConnected ? 'relative w-full' : ''} overflow-hidden`}>
        {/* Ultra-modern Header */}
        <div className="flex items-center justify-between p-6 glass-gradient border-b border-white/30 dark:border-white/[0.08] shadow-2xl backdrop-blur-3xl relative z-10">{/* Adding relative z-10 to keep header above content */}
          {/* Settings */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="apple-button flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleSettings}
            >
              <span className="settings-svg">{settingsSvg()}</span>
              <span>Settings</span>
            </Button>
          )}

          {/* Modern App Title */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/25 apple-button float-animation">
              <span className="text-white font-bold text-lg">🎙</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent tracking-tight">Voice Assistant</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">AI-powered conversation</p>
            </div>
          </div>

          {/* Ultra-modern Controls */}
          <div className="flex items-center gap-4">
            {/* Disconnect button when connected */}
            {isConnected && (
              <button
                className="h-10 px-4 font-medium transition-all duration-300 rounded-xl shadow-lg border-0 cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: 'rgb(248, 58, 58)', // destructive color from CSS
                  color: 'rgb(255, 255, 255)', // white foreground
                  border: 'none',
                }}
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Disconnecting...
                  </div>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Disconnect
                  </>
                )}
              </button>
            )}
            
            {/* Theme Toggle */}
            <div className="glass-gradient p-2 rounded-2xl shadow-lg">
              <ThemeToggle />
            </div>
            
            {/* Developer Mode */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl glass-gradient border border-white/20 dark:border-white/[0.08] shadow-lg backdrop-blur-xl">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dev Mode</span>
              <Switch
                checked={isDevelop}
                onCheckedChange={(checked: boolean) => setIsDevelop(checked)}
              />
            </div>

            {/* Clear Chat */}
            <Button
              variant="ghost"
              size="sm"
              disabled={messages.length === 0}
              onClick={() => messages.length > 0 && setMessages([])}
              className="apple-button h-10 w-10 rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 p-0"
            >
              {clearChatSvg()}
            </Button>
          </div>
        </div>

        {/* Ultra-modern Content */}
        <div className={`flex flex-1 ${isDevelop ? "developer-content" : "content"} p-6 gap-6 transition-all duration-1000 ease-apple overflow-auto ${isConnected && !isDevelop ? 'justify-center items-center w-full' : ''} relative`}>
          {/* Voice Activity Indicator */}
          {isConnected && isRecording && (
            <div className="voice-activity-indicator">
              <div className="voice-activity-bars">
                {[...Array(5)].map((_, i) => {
                  // Create different height variations based on frequency ranges
                  const baseHeight = Math.max(4, voiceActivityLevel * 0.8);
                  const variation = (i % 2 === 0 ? 1.2 : 0.8) + (Math.sin(Date.now() * 0.01 + i) * 0.3);
                  const finalHeight = Math.min(25, baseHeight * variation);
                  
                  return (
                    <div 
                      key={i}
                      className="voice-activity-bar"
                      style={{
                        height: `${finalHeight}px`,
                        opacity: Math.max(0.3, Math.min(1, voiceActivityLevel / 15))
                      }}
                    ></div>
                  );
                })}
              </div>
              <span className="voice-activity-text">
                {voiceActivityLevel > 8 ? 'Speaking...' : 'Listening...'}
              </span>
            </div>
          )}

          {/* Avatar Section - Always show when connected and avatar enabled */}
          {isConnected && isEnableAvatar && (
            <div className={`${isDevelop ? 'flex-1 max-w-lg' : 'w-full max-w-4xl'} transition-all duration-1200 ease-apple`}>
              {/* Real-time Avatar Video Window */}
              <div
                ref={videoRef}
                className={`flex justify-center items-center rounded-3xl glass-gradient border border-white/20 dark:border-white/[0.08] shadow-2xl backdrop-blur-3xl overflow-hidden avatar-center transition-all duration-1200 ease-apple h-[70vh] ${!isDevelop ? 'avatar-centered' : ''} bg-card/95 border-primary/20`}
              >
                {/* Real-time avatar video from WebRTC will be inserted here */}
              </div>
            </div>
          )}

          {/* Animation Section - Show when connected but no avatar, including in dev mode */}
          {isConnected && !isEnableAvatar && (
            <div className={`${isDevelop ? 'flex-1 max-w-lg' : 'w-full max-w-2xl'} transition-all duration-1200 ease-apple`}>
              {/* Ultra-modern Animation Window */}
              <div className={`flex justify-center items-center rounded-3xl bg-gradient-to-br from-card/90 via-card/80 to-card/95 backdrop-blur-3xl border border-border/20 border-primary/20 shadow-2xl hover:shadow-3xl ultra-message-card avatar-center transition-all duration-1200 ease-apple h-[60vh] ${!isDevelop ? 'avatar-centered' : ''}`}>
                <div
                  key="volume-circle"
                  ref={animationRef}
                  className="volume-circle transition-all duration-300"
                ></div>
                <div className="robot-svg filter drop-shadow-lg">{robotSvg()}</div>
              </div>
            </div>
          )}

          {/* Chat Section - Show when in dev mode OR when not connected */}
          {(isDevelop || !isConnected) && (
            <div className={`flex flex-1 flex-col ${isDevelop && isConnected ? 'max-w-lg' : ''}`}>
              {/* Chat Window */}
              <div className="flex flex-1 flex-col">
                {/* Ultra-modern Messages Area */}
                <div
                  id="messages-area"
                  className="flex-1 p-8 overflow-y-auto messages-area rounded-3xl bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-3xl border border-border/30 shadow-2xl transition-all duration-300"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">Start a Conversation</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Click connect to start your conversation with the AI assistant
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`group rounded-3xl p-6 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-xl ${getMessageClassNames(message.type)}`}
                          style={{
                            animationDelay: `${index * 100}ms`,
                            animationFillMode: 'both',
                            animation: 'messageSlideIn 0.6s ease-out'
                          }}
                        >
                          <div className="prose prose-sm max-w-none text-inherit">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isDevelop && (
                  <>
                    {/* Ultra-modern Input Area */}
                    <div className="p-6 border-t border-border/20 glass-gradient backdrop-blur-3xl">
                      <div className="flex gap-4">
                        <Input
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          placeholder="Type your message..."
                          onKeyUp={(e) => e.key === "Enter" && sendMessage()}
                          disabled={!isConnected}
                          className="flex-1 h-14 ultra-input text-base placeholder:text-muted-foreground/70"
                        />
                        <Button
                          variant="outline"
                          onClick={toggleRecording}
                          className={`h-14 w-14 ultra-button p-0 transition-all duration-300 ${
                            isRecording 
                              ? "bg-destructive/90 hover:bg-destructive border-destructive/30 text-destructive-foreground shadow-lg shadow-destructive/25" 
                              : "ultra-button hover:shadow-lg"
                          }`}
                          disabled={!isConnected}
                        >
                          {isRecording ? recordingSvg() : offSvg()}
                        </Button>
                        <Button 
                          onClick={sendMessage} 
                          disabled={!isConnected}
                          className="h-14 w-14 ultra-button p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40"
                        >
                          <Send className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isDevelop && isConnected && (
          <>
            {/* Record Button - Only show when connected and not in dev mode */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex justify-center items-center recording-border">
                {isConnected && isEnableAvatar && isRecording && (
                  <div className="flex justify-center items-center sound-wave">
                    <div className="sound-wave-item" id="item-0"></div>
                    <div className="sound-wave-item" id="item-1"></div>
                    <div className="sound-wave-item" id="item-2"></div>
                    <div className="sound-wave-item" id="item-3"></div>
                    <div className="sound-wave-item" id="item-4"></div>
                    <div className="sound-wave-item" id="item-5"></div>
                    <div className="sound-wave-item" id="item-6"></div>
                    <div className="sound-wave-item" id="item-7"></div>
                    <div className="sound-wave-item" id="item-8"></div>
                    <div className="sound-wave-item" id="item-9"></div>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={toggleRecording}
                  className={`ultra-button transition-all duration-300 px-8 py-4 text-base font-semibold shadow-2xl backdrop-blur-xl ${
                    isRecording 
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25" 
                      : "bg-card hover:bg-card/90 text-card-foreground shadow-lg border-border/20"
                  }`}
                  disabled={!isConnected}
                >
                  {isRecording ? (
                    <div className="flex justify-center items-center gap-3">
                      {recordingSvg()}
                      <span className="microphone">Turn off microphone</span>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-3">
                      {offSvg()}
                      <span className="microphone">Turn on microphone</span>
                    </div>
                  )}
                </Button>
                {isConnected && isEnableAvatar && isRecording && (
                  <div className="flex justify-center items-center sound-wave sound-wave2">
                    <div className="sound-wave-item" id="item-10"></div>
                    <div className="sound-wave-item" id="item-11"></div>
                    <div className="sound-wave-item" id="item-12"></div>
                    <div className="sound-wave-item" id="item-13"></div>
                    <div className="sound-wave-item" id="item-14"></div>
                    <div className="sound-wave-item" id="item-15"></div>
                    <div className="sound-wave-item" id="item-16"></div>
                    <div className="sound-wave-item" id="item-17"></div>
                    <div className="sound-wave-item" id="item-18"></div>
                    <div className="sound-wave-item" id="item-19"></div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Record Button - when not connected or in main view */}
        {!isDevelop && !isConnected && (
          <>
            <div className="flex flex-1 justify-center items-center">
              <div className="flex justify-center items-center recording-border">
                <Button
                  variant="outline"
                  onClick={toggleRecording}
                  className={`ultra-button transition-all duration-300 px-8 py-4 text-base font-semibold ${
                    isRecording 
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25" 
                      : "bg-card hover:bg-card/90 text-card-foreground shadow-lg border-border/20"
                  }`}
                  disabled={!isConnected}
                >
                  {isRecording ? (
                    <div className="flex justify-center items-center gap-3">
                      {recordingSvg()}
                      <span className="microphone">Turn off microphone</span>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-3">
                      {offSvg()}
                      <span className="microphone">Turn on microphone</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
