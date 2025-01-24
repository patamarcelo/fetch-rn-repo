import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

const SearchBar = ({ value, onChangeText, placeholder }) => {
    return (
        <TextInput
            style={styles.searchBar}
            placeholder={placeholder}
            placeholderTextColor="#888"
            value={value}
            onChangeText={onChangeText}
            autoFocus={true} // Automatically focuses when shown
        />
    );
};

const styles = StyleSheet.create({
     searchBar: {
        height: 40,
        margin: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        color: "#333"
    },
});

export default SearchBar;