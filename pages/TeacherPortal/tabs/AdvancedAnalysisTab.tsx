import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type, Chat, Part } from "@google/genai";
import { ReportSection } from '../components/common';
import { Button, Input } from '../../../components/UI';
import { ExclamationTriangleIcon, LightBulbIcon, UsersIcon, ChatBubbleLeftEllipsisIcon, SparklesIcon, SpinnerIcon } from '../../../components/Icons';
import type { ProcessedEvaluation, ConceptualDiagnosis, InterventionGroup, RiskStudent, AnalysisData, QuestionAnalysisItem, Colegio, Docente } from '../../../types';
import { OBJETIVOS_APRENDIZAJE } from '../../../lib/data';

interface AiCacheValue {
    diagnoses?: ConceptualDiagnosis[];
    interventionGroups?: {risks: RiskStudent[], groups: InterventionGroup[]};
    chatHistory?: {role: 'user' | 'model', text: string, parts?: Part[]}[];
    chatInstance?: Chat;
}

const ChatMessageContent: React.FC<{ text: string }> = ({ text }) => {
    // This regex looks for Markdown table syntax
    const tableRegex = /(\|.*\|(?:\r\n|\n|))((?:\|.*\|(?:\r\n|\n|))+)/g;
    
    // Improved regex for bold and italics
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>');       // Italics

    const parts = formattedText.split(tableRegex);

    return (
        <div className="whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (index % 3 === 1) { // This will be the table header row
                    const header = part;
                    const body = parts[index + 1];
                    const fullTable = header + body;
                    
                    const rows = fullTable.trim().split(/(\r\n|\n)/).filter(row => row.trim().startsWith('|'));
                    if (rows.length < 2) return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;

                    const headerCells = rows[0].split('|').map(c => c.trim()).filter(Boolean);
                    const bodyRows = rows.slice(2).map(row => row.split('|').map(c => c.trim()).filter(Boolean));

                    return (
                        <div key={index} className="my-2 overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse border border-gray-400 bg-white">
                                <thead>
                                    <tr>
                                        {headerCells.map((cell, i) => (
                                            <th key={i} className="p-2 border border-gray-300 bg-gray-100 font-semibold">{cell}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bodyRows.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            {row.map((cell, j) => (
                                                <td key={j} className="p-2 border border-gray-300">{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                } else if (index % 3 === 2) {
                    return null; // This is the table body part, already processed
                }
                // Render non-table text
                return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            })}
        </div>
    );
};


const MisconceptionHeatmap: React.FC<{ analysisData: AnalysisData }> = ({ analysisData }) => {
    const commonErrors = useMemo(() => {
        const errorsByOa: Record<string, Record<string, number>> = {};
        analysisData.porPregunta.forEach((q: QuestionAnalysisItem) => {
            const oaId = q.oaId;
            if (!errorsByOa[oaId]) { errorsByOa[oaId] = {}; }
            Object.entries(q.respuestasContadas).forEach(([answer, count]: [string, number]) => {
                if (answer.toUpperCase() !== q.clave.toUpperCase() && answer !== 'Omitida' && answer !== 'Correcta' && answer !== 'Incorrecta') {
                    const errorKey = `${q.numeroPregunta}-${answer}`; // e.g. "5-B"
                    errorsByOa[oaId][errorKey] = (errorsByOa[oaId][errorKey] || 0) + count;
                }
            });
        });
        return Object.entries(errorsByOa).map(([oaId, errors]) => {
            const oaInfo = OBJETIVOS_APRENDIZAJE.find(o => o.id === oaId);
            if (Object.keys(errors).length === 0) return null;
            const mostCommonError = Object.entries(errors).sort((a, b) => b[1] - a[1])[0];
            if (!mostCommonError || mostCommonError[1] === 0) return null;
            const [questionNum, incorrectAnswer] = mostCommonError[0].split('-');
            const totalStudentsOnQuestion = analysisData.porPregunta.find((p: any) => p.numeroPregunta === Number(questionNum))?.totalEstudiantes || 1;
            const percentage = (mostCommonError[1] / totalStudentsOnQuestion) * 100;
            return {
                oaName: oaInfo ? `${oaInfo.codigo}: ${oaInfo.descripcion}` : 'Desconocido',
                errorDescription: `En la pregunta ${questionNum}, el error más común fue la alternativa "${incorrectAnswer}", seleccionada por un ${percentage.toFixed(0)}% de los estudiantes.`,
                percentage: percentage,
            };
        }).filter((item): item is { oaName: string; errorDescription: string; percentage: number; } => item !== null)
          .sort((a, b) => b.percentage - a.percentage);
    }, [analysisData.porPregunta]);

    return (
        <ReportSection>
            {commonErrors && commonErrors.length > 0 ? (
                <div className="space-y-4">
                    {commonErrors.map((error, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-red-50 border-red-200">
                            <h5 className="font-bold text-red-800">{error.oaName}</h5>
                            <p className="text-sm text-gray-700 mt-2">{error.errorDescription}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-full bg-red-200 rounded-full h-2.5"><div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${error.percentage}%` }}></div></div>
                                <span className="text-sm font-semibold text-red-700">{error.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic p-4 text-center">No se encontraron errores comunes significativos para analizar.</p>
            )}
        </ReportSection>
    );
};


export const AdvancedAnalysisTab: React.FC<{ 
    evaluation: ProcessedEvaluation;
    selection: { colegio: Colegio; docente: Docente };
    aiCache: AiCacheValue;
    setAiCache: (value: AiCacheValue) => void;
}> = ({ evaluation, selection, aiCache, setAiCache }) => {
    type SubTab = 'distractores' | 'diagnostico' | 'grupos' | 'chat';
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('distractores');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagnoseError, setDiagnoseError] = useState<string | null>(null);
    const [isGrouping, setIsGrouping] = useState(false);
    const [groupingError, setGroupingError] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [isChatInitializing, setIsChatInitializing] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const { diagnoses, interventionGroups, chatHistory, chatInstance: chat } = aiCache;
    
    const { analysisData, configuracion: config, resultados } = evaluation;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleGenerateDiagnosis = async () => {
        setIsDiagnosing(true); setDiagnoseError(null); setAiCache({ ...aiCache, diagnoses: []});
        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const commonErrors = analysisData.porPregunta.map(q => { if (q.porcentajeLogro > 70) return null; const incorrectAnswers = Object.entries(q.respuestasContadas).filter(([answer, _]) => answer.toUpperCase() !== q.clave.toUpperCase() && answer !== 'Omitida' && answer !== 'Correcta' && answer !== 'Incorrecta').sort(([, countA], [, countB]) => countB - countA); if (incorrectAnswers.length === 0) return null; const mostCommonDistractor = incorrectAnswers[0]; const oaInfo = OBJETIVOS_APRENDIZAJE.find(o => o.id === q.oaId); return { questionNumber: q.numeroPregunta, correctAnswer: q.clave, mostCommonIncorrectAnswer: mostCommonDistractor[0], distractorCount: mostCommonDistractor[1] as number, totalStudents: q.totalEstudiantes, oaId: q.oaId, oaName: oaInfo ? `${oaInfo.codigo}: ${oaInfo.descripcion}` : 'Desconocido' }; }).filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 10);
            if (commonErrors.length === 0) { setDiagnoseError("No se encontraron errores comunes significativos para analizar en esta evaluación."); return; }
            const prompt = `Eres un experto en psicometría y pedagogía. Analiza los errores más comunes en la siguiente evaluación de ${config.asignatura} para ${config.nivel}. Para cada error, identifica el concepto erróneo subyacente y sugiere una remediación concreta y simple. Contexto de la evaluación: ${config.nombre}. Errores comunes detectados: ${JSON.stringify(commonErrors, null, 2)}. Devuelve un array de objetos JSON, uno para cada error analizado.`;
            const responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { oaName: { type: Type.STRING }, questionNumber: { type: Type.INTEGER }, errorDescription: { type: Type.STRING }, conceptualError: { type: Type.STRING }, remediationSuggestion: { type: Type.STRING } }, required: ["oaName", "questionNumber", "errorDescription", "conceptualError", "remediationSuggestion"] } };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema } });
            setAiCache({...aiCache, diagnoses: JSON.parse(response.text) as ConceptualDiagnosis[]});
        } catch(e) { console.error(e); setDiagnoseError("Error al generar diagnóstico. Por favor, intente de nuevo."); } finally { setIsDiagnosing(false); }
    };
    
    const handleGenerateGroups = async () => {
        setIsGrouping(true); setGroupingError(null); setAiCache({...aiCache, interventionGroups: undefined});
        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const studentDataForPrompt = resultados.map(student => { const performanceByOA = analysisData.porOA.map(oa => ({ oaName: oa.nombre, percentage: oa.metricasPorEstudiante[student.idEstudiante]?.porcentajeLogro ?? 0, })); const overallPercentage = student.puntajeTotal > 0 ? (student.puntajeObtenido / student.puntajeTotal) * 100 : 0; return { studentName: student.nombreEstudiante, overallPercentage, performanceByOA: performanceByOA.filter(p => p.percentage < 70) }; });
            const prompt = `Eres un asistente de profesor experto. Analiza los resultados de esta evaluación de ${config.asignatura} y realiza dos tareas: 1. Identifica estudiantes con 'Riesgo Alto' (<40% de logro) y 'Riesgo Medio' (40%-69% de logro). Para cada uno, lista los OAs con bajo desempeño. 2. Crea grupos de apoyo para los 3 OAs con el peor desempeño general. En cada grupo, lista a los estudiantes que tuvieron menos de 70% de logro en ese OA específico. Datos de los estudiantes: ${JSON.stringify(studentDataForPrompt, null, 2)}. Devuelve un objeto JSON con dos claves: 'risks' y 'groups'.`;
            const responseSchema = { type: Type.OBJECT, properties: { risks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { studentName: { type: Type.STRING }, riskLevel: { type: Type.STRING }, lowOAs: { type: Type.ARRAY, items: {type: Type.STRING}} }, required: ["studentName", "riskLevel", "lowOAs"] } }, groups: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { oaName: { type: Type.STRING }, studentNames: { type: Type.ARRAY, items: {type: Type.STRING}} }, required: ["oaName", "studentNames"] } } }, required: ["risks", "groups"] };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema } });
            setAiCache({...aiCache, interventionGroups: JSON.parse(response.text)});
        } catch (e) { console.error(e); setGroupingError("Error al generar grupos. Por favor, intente de nuevo."); } finally { setIsGrouping(false); }
    };

    useEffect(() => {
        const initializeChat = async () => {
            if (activeSubTab !== 'chat' || chat) return;
            setIsChatInitializing(true);
            try {
                const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
                const fullContext = { 
                    configuracion: config, 
                    resultados: resultados, 
                    analysisData: analysisData,
                    colegio: selection.colegio,
                    docente: selection.docente,
                };
                
                const systemInstruction = `Eres un asistente pedagógico experto. Tienes acceso a los datos completos de una evaluación, incluyendo la configuración, los resultados detallados de cada estudiante, el análisis psicométrico y la información del colegio y docente. Responde las preguntas del profesor basándote ÚNICAMENTE en la información proporcionada. Sé conciso y directo. Utiliza formato Markdown para dar formato a tus respuestas (listas, negritas, tablas con |). Si no puedes encontrar la respuesta en los datos, indícalo claramente.`;
                
                const chatSession = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
                
                const initialMessage = `Aquí está el contexto de la evaluación para nuestro chat: ${JSON.stringify(fullContext)}. Por favor, preséntate brevemente y confirma que estás listo para responder preguntas sobre estos datos.`;
                
                const stream = await chatSession.sendMessageStream({ message: initialMessage });
                let modelResponse = '';
                for await (const chunk of stream) { modelResponse += chunk.text; }

                const initialHistory = [{ role: 'model' as const, text: modelResponse || '¡Hola! Soy tu asistente. Estoy listo para ayudarte a analizar la evaluación.' }];
                
                setAiCache({...aiCache, chatInstance: chatSession, chatHistory: initialHistory});

            } catch(e) {
                console.error(e);
                setAiCache({...aiCache, chatHistory: [{ role: 'model', text: 'Hubo un error al iniciar el chat. Por favor, recarga e inténtalo de nuevo.' }]});
            } finally {
                setIsChatInitializing(false);
            }
        };

        initializeChat();
    }, [activeSubTab, chat, config, analysisData, resultados, selection]);

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault(); if (!chatInput.trim() || !chat || isChatting) return;
        const userMessage = chatInput; setChatInput('');
        
        const isFirstUserMessage = (chatHistory || []).filter(m => m.role === 'user').length === 0;

        const newUserHistory = [...(chatHistory || []), { role: 'user' as const, text: userMessage }];
        setAiCache({...aiCache, chatHistory: newUserHistory});
        setIsChatting(true);

        try {
            const messageParts: Part[] = [{ text: userMessage }];

            if (isFirstUserMessage && config.testFileContent) {
                const match = config.testFileContent.match(/^data:(.*);base64,(.*)$/);
                if (match) {
                    const mimeType = match[1];
                    const data = match[2];
                    messageParts.unshift({ inlineData: { mimeType, data } });
                    messageParts.unshift({ text: `Adjunto el archivo de la prueba (${config.testFileName}) para contexto adicional sobre el contenido de las preguntas.` });
                }
            }

            const stream = await chat.sendMessageStream({ message: messageParts });

            let accumulatedHistory = [...newUserHistory, { role: 'model' as const, text: '' }];
            setAiCache({...aiCache, chatHistory: accumulatedHistory});
            let modelResponse = '';

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                accumulatedHistory[accumulatedHistory.length - 1] = { role: 'model', text: modelResponse };
                setAiCache({...aiCache, chatHistory: [...accumulatedHistory]});
            }
        } catch(e) {
            console.error(e);
            const errorMessage = 'Lo siento, ocurrió un error al procesar tu pregunta.';
            const historyWithError = [...newUserHistory, {role: 'model' as const, text: errorMessage}];
            setAiCache({...aiCache, chatHistory: historyWithError});
        } finally {
            setIsChatting(false);
        }
    };
    
    const tabs = [ { id: 'distractores', label: 'Análisis de Distractores', icon: ExclamationTriangleIcon }, { id: 'diagnostico', label: 'Diagnóstico Conceptual', icon: LightBulbIcon }, { id: 'grupos', label: 'Grupos de Apoyo', icon: UsersIcon }, { id: 'chat', label: 'Preguntas a la IA', icon: ChatBubbleLeftEllipsisIcon }, ];
    const renderContent = () => {
        switch (activeSubTab) {
            case 'distractores': return <MisconceptionHeatmap analysisData={analysisData} />;
            case 'diagnostico': return ( <ReportSection title="Diagnóstico Conceptual con IA"> <div className="text-center mb-6"> <Button onClick={handleGenerateDiagnosis} disabled={isDiagnosing}> {isDiagnosing ? <SpinnerIcon className="w-5 h-5 mr-2"/> : <SparklesIcon className="w-5 h-5 mr-2" />} {isDiagnosing ? 'Analizando...' : 'Generar Diagnóstico'} </Button> </div> {isDiagnosing && <div className="text-center py-8"><SpinnerIcon className="w-8 h-8 text-primary-600" /></div>} {diagnoseError && <div className="p-4 bg-red-100 text-red-700 rounded-md">{diagnoseError}</div>} {diagnoses && diagnoses.length > 0 && ( <div className="mt-6 space-y-4"> {diagnoses.map((diag, index) => ( <div key={index} className="p-4 border rounded-lg bg-blue-50 border-blue-200"> <h5 className="font-bold text-blue-800">{diag.oaName} (Pregunta {diag.questionNumber})</h5> <p className="text-sm text-gray-700 mt-2"><strong className="text-gray-900">Error Común:</strong> {diag.errorDescription}</p> <p className="text-sm text-gray-700 mt-1"><strong className="text-gray-900">Concepto Erróneo:</strong> {diag.conceptualError}</p> <p className="text-sm text-gray-700 mt-1"><strong className="text-gray-900">Sugerencia de Remediación:</strong> {diag.remediationSuggestion}</p> </div> ))} </div> )} </ReportSection> );
            case 'grupos': return ( <ReportSection title="Sugerencia de Grupos de Apoyo con IA"> <div className="text-center mb-6"> <Button onClick={handleGenerateGroups} disabled={isGrouping}> {isGrouping ? <SpinnerIcon className="w-5 h-5 mr-2"/> : <UsersIcon className="w-5 h-5 mr-2" />} {isGrouping ? 'Analizando...' : 'Sugerir Grupos'} </Button> </div> {isGrouping && <div className="text-center py-8"><SpinnerIcon className="w-8 h-8 text-primary-600" /></div>} {groupingError && <div className="p-4 bg-red-100 text-red-700 rounded-md">{groupingError}</div>} {interventionGroups && ( <div className="mt-6 grid md:grid-cols-2 gap-8"> <div> <h4 className="font-semibold text-lg text-red-700 mb-3">Alertas de Riesgo</h4> <div className="space-y-3"> {interventionGroups.risks.map((risk, index) => ( <div key={index} className={`p-3 rounded-md border ${risk.riskLevel === 'Alto' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}> <p className="font-bold">{risk.studentName} - <span className={risk.riskLevel === 'Alto' ? 'text-red-600' : 'text-yellow-600'}>Riesgo {risk.riskLevel}</span></p> <p className="text-xs text-gray-600 mt-1">OAs a reforzar: {risk.lowOAs.join(', ')}</p> </div> ))} </div> </div> <div> <h4 className="font-semibold text-lg text-green-700 mb-3">Grupos de Apoyo</h4> <div className="space-y-3"> {interventionGroups.groups.map((group, index) => ( <div key={index} className="p-3 rounded-md border bg-green-50 border-green-200"> <p className="font-bold text-green-800">{group.oaName}</p> <p className="text-sm text-gray-700 mt-1">{group.studentNames.join(', ')}</p> </div> ))} </div> </div> </div> )} </ReportSection> );
            case 'chat': return ( <ReportSection title="Preguntas Libres a la IA"> <div className="flex flex-col h-[60vh] border rounded-lg"> {isChatInitializing ? ( <div className="flex-grow flex items-center justify-center"><SpinnerIcon className="w-8 h-8 text-primary-600" /></div> ) : ( <><div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4"> {chatHistory && chatHistory.filter(msg => msg.role === 'user' || (msg.role === 'model' && msg.text)).map((msg, index) => ( <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}> <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800'}`}> <ChatMessageContent text={msg.text} /> {isChatting && msg.role === 'model' && index === chatHistory.length - 1 && <span className="inline-block w-2 h-4 bg-gray-600 animate-pulse ml-1" />} </div> </div> ))} </div> <div className="p-4 border-t bg-white rounded-b-lg"> <form className="flex gap-2" onSubmit={handleSendChatMessage}> <Input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ej: ¿Cuál fue la pregunta más difícil y por qué?" className="flex-grow" disabled={isChatting || isChatInitializing} aria-label="Escribe tu pregunta a la IA" /> <Button type="submit" disabled={isChatting || !chatInput.trim() || isChatInitializing} aria-label="Enviar pregunta"> {isChatting ? <SpinnerIcon className="w-5 h-5"/> : "Enviar"} </Button> </form> </div></> )} </div> </ReportSection> );
            default: return null;
        }
    };
    
    return (
        <div>
            <div className="sticky top-0 bg-gray-50 z-20 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Análisis con IA</h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Advanced Analysis Tabs">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as SubTab)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${ activeSubTab === tab.id ? 'border-accent-400 text-accent-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`} >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <div className="mt-6 px-4 sm:px-6 lg:px-8">
                 {renderContent()}
            </div>
        </div>
    );
};