import Grafico from './components/Grafico';
import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Alert,
  Button,
} from 'react-native';

import * as Database from './services/Database';
import Formulario from './components/Formulario';
import ListaRegistros from './components/ListaRegistros';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [registroEmEdicao, setRegistroEmEdicao] = useState(null);
  const [criterioOrdenacao, setCriterioOrdenacao] = useState('horasJogo');

  useEffect(() => {
    const init = async () => {
      const dados = await Database.carregarDados();
      setRegistros(dados);
      setCarregando(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!carregando) {
      Database.salvarDados(registros);
    }
  }, [registros, carregando]);

  const handleSave = (horasJogo, intensidade, partidasVencidas) => {
    const horasJogoNum = parseFloat(horasJogo) || 0;
    const intensidadeNum = parseFloat(intensidade) || 0;
    const partidasVencidasNum = parseFloat(partidasVencidas) || 0;

    if (registroEmEdicao) {
      // MODO DE ATUALIZAÇÃO
      const registrosAtualizados = registros.map((reg) =>
        reg.id === registroEmEdicao.id
          ? { 
              ...reg, 
              horasJogo: horasJogoNum, 
              intensidade: intensidadeNum, 
              partidasVencidas: partidasVencidasNum 
            }
          : reg
      );
      setRegistros(registrosAtualizados);
      Alert.alert('Sucesso!', 'Registro atualizado!');
    } else {
      // MODO DE CRIAÇÃO
      const novoRegistro = {
        id: new Date().getTime(),
        data: new Date().toLocaleDateString('pt-BR'),
        horasJogo: horasJogoNum,
        intensidade: intensidadeNum,
        partidasVencidas: partidasVencidasNum,
      };
      setRegistros([...registros, novoRegistro]);
      Alert.alert('Sucesso!', 'Registro salvo!');
    }

    setRegistroEmEdicao(null);
  };

  const handleDelete = (id) => {
    setRegistros(registros.filter((reg) => reg.id !== id));
  };

  const handleIniciarEdicao = (registro) => {
    setRegistroEmEdicao(registro);
  };

  const handleCancelarEdicao = () => {
    setRegistroEmEdicao(null);
  };

  const exportarDados = async () => {
    if (Platform.OS === 'web') {
      const jsonString = JSON.stringify(registros, null, 2);
      if (registros.length === 0) {
        return Alert.alert('Aviso', 'Nenhum dado para exportar.');
      }
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dados_jogos.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      if (registros.length === 0) {
        return Alert.alert('Aviso', 'Nenhum dado para exportar.');
      }

      const jsonString = JSON.stringify(registros, null, 2);
      const fileUri = FileSystem.documentDirectory + 'dados_jogos.json';

      try {
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        if (!(await Sharing.isAvailableAsync())) {
          return Alert.alert('Erro', 'Compartilhamento não disponível.');
        }

        await Sharing.shareAsync(fileUri);
      } catch (error) {
        Alert.alert('Erro', 'Falha ao exportar dados: ' + error.message);
      }
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  let registrosExibidos = [...registros];

  if (ordenacao === 'maior_valor') {
    // Ordena pelo critério selecionado
    registrosExibidos.sort((a, b) => b[criterioOrdenacao] - a[criterioOrdenacao]);
  } else {
    registrosExibidos.sort((a, b) => b.id - a.id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.titulo}>Meu Diário de Jogos</Text>
        <Text style={styles.subtitulo}>Acompanhe seu desempenho nos games</Text>

        <Grafico registros={registrosExibidos} />

        <Formulario
          onSave={handleSave}
          onCancel={handleCancelarEdicao}
          registroEmEdicao={registroEmEdicao}
        />

        <View style={styles.botoesOrdenacao}>
          <Button
            title="Mais Recentes"
            onPress={() => setOrdenacao('recentes')}
          />
          <Button
            title="Mais Horas"
            onPress={() => {
              setOrdenacao('maior_valor');
              setCriterioOrdenacao('horasJogo');
            }}
          />
          <Button
            title="Maior Intensidade"
            onPress={() => {
              setOrdenacao('maior_valor');
              setCriterioOrdenacao('intensidade');
            }}
          />
          <Button
            title="Mais Vitórias"
            onPress={() => {
              setOrdenacao('maior_valor');
              setCriterioOrdenacao('partidasVencidas');
            }}
          />
        </View>

        <ListaRegistros
          registros={registrosExibidos}
          onEdit={handleIniciarEdicao}
          onDelete={handleDelete}
        />

        <View style={styles.card}>
          <Text style={styles.subtituloCard}>Exportar Dados</Text>
          <TouchableOpacity
            style={styles.botaoExportar}
            onPress={exportarDados}>
            <Text style={styles.botaoTexto}>Exportar dados_jogos.json</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    backgroundColor: '#2c3e50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#ecf0f1',
  },
  subtitulo: {
    textAlign: 'center',
    fontSize: 16,
    color: '#bdc3c7',
    marginTop: -10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  botoesOrdenacao: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  subtituloCard: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#ecf0f1',
    textAlign: 'center',
  },
  botaoExportar: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  botaoTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});