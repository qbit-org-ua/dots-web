use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct Language {
    pub id: i32,
    pub name: &'static str,
}

pub fn all_languages() -> Vec<Language> {
    vec![
        Language {
            id: 2,
            name: "C (C89)",
        },
        Language {
            id: 18,
            name: "C (C11)",
        },
        Language {
            id: 3,
            name: "C++ (C++03)",
        },
        Language {
            id: 19,
            name: "C++ (C++11)",
        },
        Language {
            id: 20,
            name: "C++ (C++14)",
        },
        Language {
            id: 30,
            name: "C++ (C++17)",
        },
        Language {
            id: 37,
            name: "C++ (C++20)",
        },
        Language {
            id: 4,
            name: "Pascal",
        },
        Language {
            id: 39,
            name: "Delphi",
        },
        Language {
            id: 35,
            name: "C# 8",
        },
        Language {
            id: 14,
            name: "C# Mono",
        },
        Language {
            id: 13,
            name: "Java 7",
        },
        Language {
            id: 17,
            name: "Java 8",
        },
        Language {
            id: 24,
            name: "Scala",
        },
        Language {
            id: 26,
            name: "Kotlin",
        },
        Language { id: 16, name: "Go" },
        Language {
            id: 21,
            name: "Haskell",
        },
        Language {
            id: 33,
            name: "OCaml",
        },
        Language {
            id: 22,
            name: "Nim",
        },
        Language {
            id: 23,
            name: "Rust",
        },
        Language {
            id: 34,
            name: "Swift",
        },
        Language {
            id: 36,
            name: "Dart",
        },
        Language {
            id: 11,
            name: "Python 2",
        },
        Language {
            id: 12,
            name: "Python 3",
        },
        Language {
            id: 38,
            name: "Python 3 PyPy",
        },
        Language {
            id: 28,
            name: "Python Data Science",
        },
        Language {
            id: 15,
            name: "Ruby",
        },
        Language {
            id: 25,
            name: "PHP",
        },
        Language {
            id: 27,
            name: "Bash",
        },
        Language {
            id: 31,
            name: "JavaScript",
        },
    ]
}

pub fn language_name(id: i32) -> &'static str {
    for lang in all_languages() {
        if lang.id == id {
            return lang.name;
        }
    }
    "Unknown"
}
