import React from 'react';
import {
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Button
} from 'react-native';
import {
    TabRouter,
    createNavigator,
    createNavigationContainer,
    SafeAreaView,
    addNavigationHelpers,
} from 'react-navigation';
import aws from '../aws';

function AlarmLine(alarm) {
    return <Text style={{color: 'white'}}>{alarm.item.metric} {alarm.item.operator} {alarm.item.threshold}</Text>
}

function ServiceTile({item}) {
    let bg;

    switch(item.state) {
        case 'ALARM':
            bg = 'red';
            break;
        case 'INSUFFICIENT_DATA':
            bg = 'yellow';
            break;
        default:
            bg = 'green';
    }

    return (
        <View style={{flex: 2, backgroundColor: bg, padding: 10, borderColor: 'white', borderWidth: 1}}>
            <Text style={{fontSize: 16, color: 'white'}}>{item.name}</Text>
            <FlatList data={item.alarms.filter(a => a.state !== 'OK')} renderItem={AlarmLine} keyExtractor={(item, index) => index}/>
        </View>
    );
}

function ServicesScreen({ services }) {
    return (
        <FlatList data={services} renderItem={ServiceTile} />
    );
}

function UnhealthyScreen({ screenProps }) {
    const unhealthyServices = screenProps.services.filter(s => s.state !== 'OK');

    return ServicesScreen( { services: unhealthyServices } );
}

function HealthyScreen({ screenProps }) {
    const healthyServices = screenProps.services.filter(s => s.state === 'OK');

    return ServicesScreen( { services: healthyServices } );
}

const ServicesTabRouter = TabRouter({
    Unhealthy: {
        screen: UnhealthyScreen,
        path: 'unhealthy'
    },
    Healthy: {
        screen: HealthyScreen,
        path: 'healthy'
    }
}, {
    initialRouteName: 'Unhealthy'
});

function ServicesTabBar({ navigation }) {
    const { routes } = navigation.state;
    return (
        <SafeAreaView style={{
            flexDirection: 'row',
            height: 48,
        }}>
            {routes.map(route => (
                <TouchableOpacity
                    onPress={() => navigation.navigate(route.routeName)}
                    key={route.routeName}
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 4,
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 4,
                    }}
                    >
                    <Text>{route.routeName}</Text>
                </TouchableOpacity>
            ))}
        </SafeAreaView>
    );
}

function byName(service1, service2) {
    if(service1.name < service2.name) return -1;
    if(service1.name > service2.name) return 1;

    return 0;
}

class ServicesTabView extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            services: []
        };
    }

    componentDidMount() {
        aws.getECSServicesWithAlarms()
           .then(services => this.setState({services}));
    }

    render() {
        const { navigation, router } = this.props;
        const { routes, index } = navigation.state;
        const ActiveScreen = router.getComponentForRouteName(routes[index].routeName);
        const orderedServices = this.state.services.sort(byName);

        return (
            <SafeAreaView forceInset={{ top: 'always' }}>
                <ServicesTabBar navigation={navigation} />
                <ActiveScreen
                    navigation={addNavigationHelpers({
                            dispatch: navigation.dispatch,
                            state: routes[index],
                    })}
                    screenProps={{services: orderedServices}}
                />
            </SafeAreaView>
        );
    }
}

const ServicesTabs = createNavigationContainer(
    createNavigator(ServicesTabRouter)(ServicesTabView)
);

class Services extends React.Component {

    static navigationOptions = ({ navigation }) => ({
        title: 'Services',
        headerRight: <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
    });

    render() {
        return <ServicesTabs />;
    }
}

export default Services;