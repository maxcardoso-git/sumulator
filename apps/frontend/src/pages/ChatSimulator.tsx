import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Grid,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Select,
  Badge,
  ScrollArea,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSend, IconPlus, IconX } from '@tabler/icons-react';
import { chatApi, environmentsApi, ChatMessage } from '../lib/api';
import { io, Socket } from 'socket.io-client';

export function ChatSimulatorPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [newSessionModal, setNewSessionModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const { data: sessions } = useQuery({
    queryKey: ['chat-sessions', selectedEnvironment],
    queryFn: () => chatApi.getSessions(selectedEnvironment || undefined),
  });

  const { data: sessionDetails } = useQuery({
    queryKey: ['chat-session', selectedSession],
    queryFn: () => (selectedSession ? chatApi.getSession(selectedSession) : null),
    enabled: !!selectedSession,
  });

  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setSelectedSession(session.id);
      setNewSessionModal(false);
      notifications.show({
        title: 'Sessão criada',
        message: `Sessão ${session.id.slice(0, 8)} criada com sucesso`,
        color: 'green',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      chatApi.sendMessage(sessionId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', selectedSession] });
      setMessage('');
    },
  });

  // WebSocket connection
  useEffect(() => {
    socketRef.current = io('/chat', { path: '/socket.io' });

    socketRef.current.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', selectedSession] });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedSession && socketRef.current) {
      socketRef.current.emit('join_session', { sessionId: selectedSession });
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [sessionDetails?.messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedSession) return;
    sendMessageMutation.mutate({ sessionId: selectedSession, content: message });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Chat Simulator</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setNewSessionModal(true)}>
          Nova Sessão
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="md" h={600}>
            <Stack>
              <Select
                placeholder="Filtrar por ambiente"
                data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
                value={selectedEnvironment}
                onChange={setSelectedEnvironment}
                clearable
              />

              <ScrollArea h={500}>
                <Stack gap="xs">
                  {sessions?.length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      Nenhuma sessão encontrada
                    </Text>
                  )}
                  {sessions?.map((session) => (
                    <Paper
                      key={session.id}
                      withBorder
                      p="sm"
                      style={{
                        cursor: 'pointer',
                        backgroundColor:
                          selectedSession === session.id ? 'var(--mantine-color-blue-light)' : undefined,
                      }}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {session.externalSessionId || session.id.slice(0, 8)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {session.environment.code}
                          </Text>
                        </div>
                        <Badge color={session.status === 'active' ? 'green' : 'gray'} size="sm">
                          {session.status}
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" h={600}>
            {!selectedSession ? (
              <Stack justify="center" align="center" h="100%">
                <Text c="dimmed">Selecione ou crie uma sessão para iniciar</Text>
              </Stack>
            ) : (
              <Stack h="100%">
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>Sessão: {selectedSession.slice(0, 8)}</Text>
                    <Text size="xs" c="dimmed">
                      {sessionDetails?.environment?.name} / {sessionDetails?.scenario?.name || 'Sem cenário'}
                    </Text>
                  </div>
                  <ActionIcon variant="subtle" onClick={() => setSelectedSession(null)}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>

                <ScrollArea flex={1} viewportRef={scrollRef}>
                  <Stack gap="md" p="xs">
                    {sessionDetails?.messages?.map((msg: ChatMessage) => (
                      <Paper
                        key={msg.id}
                        p="sm"
                        withBorder
                        style={{
                          alignSelf: msg.direction === 'inbound' ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          backgroundColor:
                            msg.direction === 'inbound'
                              ? 'var(--mantine-color-blue-light)'
                              : 'var(--mantine-color-gray-light)',
                        }}
                      >
                        <Text size="xs" c="dimmed" mb={4}>
                          {msg.direction === 'inbound' ? 'Você' : 'Orquestrador'}
                        </Text>
                        <Text size="sm">{msg.content}</Text>
                        <Text size="xs" c="dimmed" ta="right" mt={4}>
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR')}
                        </Text>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>

                <Group>
                  <TextInput
                    flex={1}
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <ActionIcon
                    size="lg"
                    variant="filled"
                    onClick={handleSend}
                    loading={sendMessageMutation.isPending}
                  >
                    <IconSend size={18} />
                  </ActionIcon>
                </Group>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <Modal opened={newSessionModal} onClose={() => setNewSessionModal(false)} title="Nova Sessão">
        <Stack>
          <Select
            label="Ambiente"
            placeholder="Selecione o ambiente"
            data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
            value={selectedEnvironment}
            onChange={setSelectedEnvironment}
            required
          />
          <Button
            onClick={() =>
              selectedEnvironment && createSessionMutation.mutate({ environment_id: selectedEnvironment })
            }
            loading={createSessionMutation.isPending}
            disabled={!selectedEnvironment}
          >
            Criar Sessão
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
