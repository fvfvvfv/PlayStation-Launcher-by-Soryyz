use crate::config::{TagsData, TagsState};

#[tauri::command]
pub fn get_tags_data(state: tauri::State<TagsState>) -> TagsData {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_tags_data(state: tauri::State<TagsState>, data: TagsData) {
    let mut s = state.0.lock().unwrap();
    *s = data.clone();
    TagsState::save(&s);
}
