import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  rem,
  Tooltip,
  Badge,
  Stack,
} from '@mantine/core';

// Build info - injected at build time via Vite
const BUILD_VERSION = import.meta.env.VITE_GIT_COMMIT_HASH || 'dev';
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString();
import {
  IconDashboard,
  IconMessage,
  IconForms,
  IconDatabase,
  IconApi,
  IconChartBar,
  IconBrain,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconServer,
  IconTestPipe,
  IconBook,
  IconPlugConnected,
  IconReportAnalytics,
} from '@tabler/icons-react';
import { useAuthStore } from '../stores/auth.store';

const navItems = [
  { label: 'Dashboard', icon: IconDashboard, path: '/dashboard' },
  { label: 'Chat Simulator', icon: IconMessage, path: '/chat' },
  { label: 'Formulários', icon: IconForms, path: '/forms' },
  { label: 'Data Generator', icon: IconDatabase, path: '/data-generator' },
  { label: 'Domínio Semântico', icon: IconBrain, path: '/semantic-domain' },
  { label: 'APIs Simuladas', icon: IconApi, path: '/simulated-apis' },
  { label: 'Observabilidade', icon: IconChartBar, path: '/observability' },
  { label: 'Ambientes', icon: IconServer, path: '/environments' },
  { label: 'Cenários', icon: IconTestPipe, path: '/scenarios' },
  { label: 'Documentação API', icon: IconBook, path: '/api-docs' },
  { label: 'APIs Externas', icon: IconPlugConnected, path: '/external-apis' },
  { label: 'Analise de Dados', icon: IconReportAnalytics, path: '/data-analysis' },
];

export function AppLayout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={() => setOpened(!opened)} hiddenFrom="sm" size="sm" />
            <Text size="lg" fw={700} c="blue">
              Orchestrator Simulator
            </Text>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Text size="sm">{user?.name || user?.email}</Text>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Conta</Menu.Label>
              <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}>
                Configurações
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleLogout}
              >
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={18} />}
                active={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setOpened(false);
                }}
                mb={4}
              />
            ))}
          </div>
          <Tooltip
            label={`Build: ${BUILD_DATE}`}
            position="right"
            withArrow
          >
            <Badge
              variant="light"
              color="gray"
              size="sm"
              style={{ cursor: 'help' }}
            >
              v{BUILD_VERSION.substring(0, 7)}
            </Badge>
          </Tooltip>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
