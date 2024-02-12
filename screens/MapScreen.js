import MapView from 'react-native-maps';
import { View, Text , StyleSheet} from "react-native";
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';




const MapScreen = ({navigation}) => {

    return (  
            <View style={styles.container}>
              <MapView style={styles.map}
               initialRegion={{
                latitude: -10.799427,
                longitude: -49.634068,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              mapType='satellite'
              />
              <View style={{width:50 , height: 50, backgroundColor:"transparent",position:'absolute',bottom: '30%',left:"80%",zIndex:10, borderRadius: 50}}>
              <IconButton
						type={"paper"}
						icon="target-account"
						color={'grey'}
						size={28}
						// onPress={handlerFarms}
						btnStyles={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 50, justifyContent: 'center', alignItems: 'center', height: 50, width: 50 }}
					/>
              <IconButton
						type={"awesome"}
						icon="filter"
						color={'grey'}
						size={22}
						// onPress={handlerFarms}
						btnStyles={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 50, justifyContent: 'center', alignItems: 'center', height: 50, width: 50 }}
					/>
              <IconButton
						type={""}
						icon="arrow-back-outline"
						color={'grey'}
						size={22}
						onPress={() => navigation.navigate('HomeStackScreen')}
						btnStyles={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 50, justifyContent: 'center', alignItems: 'center', height: 50, width: 50 }}
					/>
</View>
            </View>
    );
}
    const styles = StyleSheet.create({
        container: {
            flex: 1
        },
        map:{
            flex: 1,
            width: '100%',
            height: '100%'
        }
    })
export default MapScreen;