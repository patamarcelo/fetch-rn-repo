import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Icon } from 'react-native-paper'

function IconButton({ icon, color, size, onPress, type, btnStyles }) {

	if(type === 'paper'){
		return (
			<Pressable
			style={({ pressed }) => [
				styles.button,
				pressed && styles.pressed,
				btnStyles
			]}
			onPress={onPress}
		>
			<Icon source={icon} size={size} color={color} />
		</Pressable>
		)
	}
	return (
		<Pressable
			style={({ pressed }) => [
				styles.button,
				pressed && styles.pressed,
				btnStyles
			]}
			onPress={onPress}
		>
			{type === "awesome" ? (
				<FontAwesome name={icon} size={size} color={color} />
			) : (
				<Ionicons name={icon} color={color} size={size} />
			)}
		</Pressable>
	);
}

export default IconButton;

const styles = StyleSheet.create({
	button: {
		margin: 8,
		borderRadius: 20
	},
	pressed: {
		opacity: 0.7
	}
});
