import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      login(response.access_token, response.user);
      notifications.show({
        title: 'Bem-vindo!',
        message: `Olá, ${response.user.name || response.user.email}`,
        color: 'green',
      });
      navigate('/dashboard');
    } catch (error) {
      notifications.show({
        title: 'Erro de autenticação',
        message: error instanceof Error ? error.message : 'Credenciais inválidas',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={100}>
      <Center mb="xl">
        <Title order={1} c="blue">
          Orchestrator Simulator
        </Title>
      </Center>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Title order={2} ta="center" mb="md">
          Login
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading}>
              Entrar
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="md">
          Usuário padrão: admin@simulator.local / admin123
        </Text>
      </Paper>
    </Container>
  );
}
